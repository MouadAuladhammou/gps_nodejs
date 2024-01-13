const asyncHandler = require("express-async-handler");
const { User, Group, Vehicle, Setting } = require("../models/index.js");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const loginUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findOne({
      where: { email: req.body.email, password: req.body.password },
      include: [
        {
          model: Group,
          as: "groupes",
          include: [
            {
              model: Vehicle,
              as: "vehicles",
            },
            {
              model: Setting,
              as: "setting",
              attributes: ["id", "name", "description"],
            },
          ],
        },
      ],
    });

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    } else {
      let payload = { subject: user.id };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_DURING,
      });
      res.status(200).send({ token, user });
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const currentUser = asyncHandler(async (req, res) => {
  // s'assurer que les en-têtes de réponse n'ont pas encore été envoyés
  if (!res.headersSent) {
    if (req.userId) {
      // Obtenir les informations de l'utilisateur actuel, puis les inclure dans la réponse
      const user = await User.findOne({
        where: { id: req.userId },
        include: [
          {
            model: Group,
            as: "groupes",
            include: [
              {
                model: Vehicle,
                as: "vehicles",
              },
              {
                model: Setting,
                as: "setting",
                attributes: ["id", "name", "description"],
              },
            ],
          },
        ],
      });

      if (user) {
        res.status(200).send({
          user,
        });

        // ceci juste pour tester la réponse lourde
        // let responseSent = false;
        // setTimeout(() => {
        //   if (!responseSent) {
        //     res.status(200).send({
        //       user,
        //     });
        //     responseSent = true;
        //   }
        // }, 5000);
      } else {
        res.status(404);
        throw new Error("User not found");
      }
    }
  }
});

const registerUser = asyncHandler(async (req, res) => {
  const user = await User.create({
    last_name: req.body.last_name,
    first_name: req.body.first_name,
    email: req.body.email,
    cin: req.body.cin,
    address: req.body.address,
    city: req.body.city,
    postal_code: req.body.postal_code,
    cell_phone: req.body.cell_phone,
    work_phone: req.body.work_phone,
    password: req.body.password,
    status: req.body.status,
  });

  if (user) {
    let payload = { subject: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_DURING,
    });
    res.status(200).send({
      token,
      user: user.dataValues,
    });
  } else {
    res.status(400);
    throw new Error("User data is not valid");
  }
});

const updateUser = asyncHandler(async (req, res) => {
  await User.update(
    {
      last_name: req.body.last_name,
      first_name: req.body.first_name,
      email: req.body.email,
      cin: req.body.cin,
      address: req.body.address,
      city: req.body.city,
      postal_code: req.body.postal_code,
      cell_phone: req.body.cell_phone,
      work_phone: req.body.work_phone,
      password: req.body.password,
    },
    {
      where: { id: req.params.id },
    }
  );
  const user = await User.findByPk(req.params.id);
  res.status(200).send(user);
});

const checkEmailUnique = asyncHandler(async (req, res) => {
  const foundUser = await User.findOne({ where: { email: req.query.q } });
  foundUser ? res.status(200).send(true) : res.status(200).send(false);
});

const checkCinUnique = asyncHandler(async (req, res) => {
  const foundUser = await User.findOne({ where: { cin: req.query.q } });
  foundUser ? res.status(200).send(true) : res.status(200).send(false);
});

const checkPhoneNumberUnique = asyncHandler(async (req, res) => {
  const foundUser = await User.findOne({
    where: {
      [Op.or]: [{ cell_phone: req.query.q }, { work_phone: req.query.q }],
    },
  });
  foundUser ? res.status(200).send(true) : res.status(200).send(false);
});

const createAndCheckUser = asyncHandler(async (req, res) => {
  try {
    // Essayer d'insérer le User
    const user = await User.create({
      last_name: req.body.last_name,
      first_name: req.body.first_name,
      email: req.body.email,
      cin: req.body.cin,
      address: req.body.address,
      city: req.body.city,
      postal_code: req.body.postal_code,
      cell_phone: req.body.cell_phone,
      work_phone: req.body.work_phone,
      password: req.body.password,
      status: req.body.status,
    });
    res.status(201).send(user);
  } catch (error) {
    // Vérifier si l'erreur est liée à une violation d'unicité dans MySQL
    if (error.name === "SequelizeUniqueConstraintError") {
      let existingField;
      if (error.fields.email !== undefined) {
        existingField = "email";
      } else if (error.fields.cin !== undefined) {
        existingField = "cin";
      } else if (error.fields.cell_phone !== undefined) {
        existingField = "cell_phone";
      } else if (error.fields.work_phone !== undefined) {
        existingField = "work_phone";
      }
      res.status(409).send({
        exists: true,
        existingField,
      });
    } else {
      // Une autre erreur s'est produite
      console.error("Erreur lors de la création d'utilisateur", error);
      res.status(500);
      throw new Error("Internal Server Error");
    }
  }
});

const updateAndCheckUser = asyncHandler(async (req, res) => {
  const { id } = req.body;
  try {
    await User.update(
      {
        last_name: req.body.last_name,
        first_name: req.body.first_name,
        email: req.body.email,
        cin: req.body.cin,
        address: req.body.address,
        city: req.body.city,
        postal_code: req.body.postal_code,
        cell_phone: req.body.cell_phone,
        work_phone: req.body.work_phone,
        password: req.body.password,
        status: req.body.status,
      },
      {
        where: { id },
      }
    );
    // res.status(200).send(true);
    const user = await User.findByPk(id);
    res.status(200).send({
      user,
    });
  } catch (error) {
    // Vérifier si l'erreur est liée à une violation d'unicité dans MySQL
    if (error.name === "SequelizeUniqueConstraintError") {
      let existingField;
      if (error.fields.email !== undefined) {
        existingField = "email";
      } else if (error.fields.cin !== undefined) {
        existingField = "cin";
      } else if (error.fields.cell_phone !== undefined) {
        existingField = "cell_phone";
      } else if (error.fields.work_phone !== undefined) {
        existingField = "work_phone";
      }
      res.status(409).send({
        exists: true,
        existingField,
      });
    } else {
      // Une autre erreur s'est produite
      console.error("Erreur lors de la modification d'utilisateur", error);
      res.status(500);
      throw new Error("Internal Server Error");
    }
  }
});

const deleteUser = asyncHandler(async (req, res) => {
  const rowDeleted = await User.destroy({
    where: { id: req.params.id },
  });
  if (rowDeleted) res.status(204).end();
  else {
    res.status(404);
    throw new Error("User not found");
  }
});

module.exports = {
  loginUser,
  currentUser,
  registerUser,
  updateUser,
  checkEmailUnique,
  checkCinUnique,
  checkPhoneNumberUnique,
  createAndCheckUser,
  updateAndCheckUser,
  deleteUser,
};

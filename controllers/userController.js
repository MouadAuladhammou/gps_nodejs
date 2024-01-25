const asyncHandler = require("express-async-handler");
const { User } = require("../models/index.js");
const userService = require("../services/userService");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await userService.login(email, password);
    if (!user) {
      res.status(404);
      throw new Error("User not found!");
    } else {
      const token = userService.generateAuthToken(user);
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
      try {
        // Obtenir les informations de l'utilisateur actuel, puis les inclure dans la réponse
        const user = await userService.getCurrentUser(req.userId);

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
          throw new Error("User not found!");
        }
      } catch (err) {
        res.status(500);
        throw new Error("Internal Server Error: " + err.message);
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
    throw new Error("User data is not valid!");
  }
});

const checkEmailUnique = asyncHandler(async (req, res) => {
  try {
    const foundUser = await User.findOne({ where: { email: req.query.q } });
    foundUser ? res.status(200).send(true) : res.status(200).send(false);
  } catch (err) {
    res.status(400);
    throw new Error("Error checking email uniqueness: " + err.message);
  }
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
    const user = await userService.create(req.body);
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
      res.status(500);
      throw new Error("Internal Server Error: " + error.message);
    }
  }
});

const updateAndCheckUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    await userService.update(id, req.body);
    const user = await userService.getUserById(id);
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
      res.status(500);
      throw new Error("Internal Server Error:" + error.message);
    }
  }
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const rowDeleted = await userService.remove(id);
    if (rowDeleted) res.status(204).end();
    else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error" + err.message);
  }
});

module.exports = {
  loginUser,
  currentUser,
  registerUser,
  checkEmailUnique,
  checkCinUnique,
  checkPhoneNumberUnique,
  createAndCheckUser,
  updateAndCheckUser,
  deleteUser,
};

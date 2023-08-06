const asyncHandler = require("express-async-handler");
const { User, Group, Vehicle } = require("../models/index.js");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const loginUser = asyncHandler(async (req, res) => {
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
            ],
          },
        ],
      });

      if (user) {
        // res.status(200).send({
        //   user,
        // });

        // ceci juste pour tester la réponse lourde
        let responseSent = false;
        setTimeout(() => {
          if (!responseSent) {
            res.status(200).send({
              user,
            });
            responseSent = true;
          }
        }, 5000);
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
    has_company: req.body.has_company,
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
  const updatedUser = await User.update(
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
  res.status(200).send(updatedUser);
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

module.exports = {
  loginUser,
  currentUser,
  registerUser,
  updateUser,
  checkEmailUnique,
  checkCinUnique,
  checkPhoneNumberUnique,
};

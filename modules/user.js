const express = require("express");
var router = express.Router();
const { User, Group, Vehicle } = require("../models/index.js");
const { verifyToken } = require("../middleware/check_token");

const jwt = require("jsonwebtoken");
require("dotenv").config();
const { Op } = require("sequelize");

// Admin
router.get("/all", async (req, res) => {
  const pageAsNumber = Number.parseInt(req.query.page);
  const sizeAsNumber = Number.parseInt(req.query.limit);
  const nameSearch = String(req.query.search) || null;
  let search = {};
  if (nameSearch)
    search = {
      [Op.or]: [
        { last_name: { [Op.like]: `%${nameSearch}%` } },
        { first_name: { [Op.like]: `%${nameSearch}%` } },
      ],
    };

  let page = 0;
  if (!Number.isNaN(pageAsNumber) && pageAsNumber > 0) {
    page = pageAsNumber;
  }

  let size = 10;
  if (
    !Number.isNaN(sizeAsNumber) &&
    !(sizeAsNumber > 10) &&
    !(sizeAsNumber < 1)
  ) {
    size = sizeAsNumber;
  }

  await User.findAndCountAll({
    limit: size,
    offset: page * size,
    where: search,
  })
    .then(function (result) {
      if (!result) return "not found";
      // else res.send(result);
      else
        res.send({
          users: result.rows,
          totalPages: Math.ceil(result.count / Number.parseInt(size)),
        });
    })
    .catch((error) => {
      console.error("Error : ", error);
    });

  // User.findAll()
  //   .then(function (result) {
  //     if (!result) return "not found";
  //     else res.send(result);
  //   })
  //   .catch((error) => {
  //     console.error("Error : ", error);
  //   });
});

router.get("/show/:id", (req, res) => {
  User.findOne({
    where: { id: req.params.id },
  })
    .then(function (result) {
      if (!result) return "not found";
      else res.send(result.dataValues);
    })
    .catch((error) => {
      console.error("Error : ", error);
    });
});

router.delete("/delete/:id", (req, res) => {
  User.destroy({
    where: { id: req.params.id },
  })
    .then(function (rowDeleted) {
      if (rowDeleted === 1) {
        res.send("Deleted successfully");
      }
    })
    .catch((error) => {
      console.error("Error : ", error);
    });
});

router.get("/:id/vehicle", (req, res) => {
  User.findOne({
    where: { id: req.params.id, status: true },
    include: [
      {
        model: Vehicle,
        as: "vehicle",
      },
    ],
  })
    .then(function (result) {
      if (!result) return "not found";
      else res.send(result.dataValues);
    })
    .catch((error) => {
      console.error("Error : ", error);
    });
});

// User
const {
  loginUser,
  currentUser,
  registerUser,
  updateUser,
  checkEmailUnique,
  checkCinUnique,
  checkPhoneNumberUnique,
} = require("../controllers/userController.js");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logged-in", verifyToken, currentUser);
router.put("/:id", verifyToken, updateUser);
router.get("/email/unique", checkEmailUnique);
router.get("/cin/unique", checkCinUnique);
router.get("/phone/unique", checkPhoneNumberUnique);

module.exports = router;

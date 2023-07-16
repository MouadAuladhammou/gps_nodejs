const express = require("express");
var router = express.Router();
const { User, Vehicle } = require("../models/index.js");
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

// User
router.get("/logged-in", verifyToken, (req, res) => {
  if (!res.headersSent) {
    if (req.userId) {
      // Obtenir les informations de l'utilisateur actuel, puis les inclure dans la réponse
      User.findOne({ where: { id: req.userId } })
        .then(function (result) {
          if (result) {
            res.status(200).send({
              id: req.userId,
              name: `${result.first_name} ${result.last_name}`,
            });
          } else res.status(401).send({ Error: "Invalid data" });
        })
        .catch((error) => {
          console.error("Error : ", error);
        });
    }
  }
});

router.post("/register", (req, res) => {
  User.create({
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
  })
    .then((result) => {
      let payload = { subject: result.id };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_DURING,
      });
      res.status(200).send({
        token,
        user: result.dataValues,
      });
    })
    .catch((error) => {
      console.error("Failed to create a new record : ", error);
    });
});

router.post("/login", (req, res) => {
  let user = req.body;
  User.findOne({
    where: { email: user.email, password: user.password },
  })
    .then(function (user) {
      if (!user) {
        res.status(401).send({ Error: "Invalid Email or Password" });
      } else {
        let payload = { subject: user.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_DURING,
        });
        res.status(200).send({ token, user });
      }
    })
    .catch((error) => {
      res.status(500).send({ Error: error });
    });
});

router.put("/update/:id", (req, res) => {
  User.update(
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
  )
    .then((result) => {
      res.send("done");
    })
    .catch((error) => {
      console.error("Error : ", error);
    });
});

router.get("/email/unique", async (req, res) => {
  User.findOne({ where: { email: req.query.q } })
    .then(function (result) {
      if (!result) res.send(false);
      else res.send(true);
    })
    .catch((error) => {
      console.error("Error : ", error);
    });
});

router.get("/cin/unique", async (req, res) => {
  User.findOne({ where: { cin: req.query.q } })
    .then(function (result) {
      if (!result) res.send(false);
      else res.send(true);
    })
    .catch((error) => {
      console.error("Error : ", error);
    });
});

router.get("/phone/unique", async (req, res) => {
  User.findOne({
    where: {
      [Op.or]: [{ cell_phone: req.query.q }, { work_phone: req.query.q }],
    },
  })
    .then(function (result) {
      if (!result) res.send(false);
      else res.send(true);
    })
    .catch((error) => {
      console.error("Error : ", error);
    });
});

// Communes
router.get("/:id/vehicle", (req, res) => {
  User.findOne({
    where: { id: req.params.id, has_company: false, status: true },
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

module.exports = router;

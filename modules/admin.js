const express = require("express");
var router = express.Router();
const { Admin, User } = require("../models/index.js");

const jwt = require("jsonwebtoken");
require("dotenv").config();
const { Op } = require("sequelize");
const { verifyAdminToken } = require("../middleware/check_token");

// Super Admin (cette partie est pas encore traitée)
/////////////////////////////////////////////////
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

router.post("/add", (req, res) => {
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
/////////////////////////////////////////////////

const roles_admin = [
  {
    user: {
      add: true,
      edit: false,
      delete: false,
    },
    admin: {
      add: false,
      edit: false,
      delete: false,
    },
    vehicle: {
      add: true,
      edit: true,
      delete: false,
    },
  },
];

let refreshTokens = [];

const generateAccessToken = (admin) => {
  return jwt.sign(
    {
      id: admin.id,
      first_name: admin.first_name,
      last_name: admin.last_name,
      roles: admin.roles,
    },
    "mySecretKey",
    {
      expiresIn: "100000s",
    }
  );
};

const generateRefreshToken = (admin) => {
  return jwt.sign(
    {
      id: admin.id,
      first_name: admin.first_name,
      last_name: admin.last_name,
      roles: admin.roles,
    },
    "myRefreshSecretKey",
    {
      expiresIn: "200000s",
    }
  );
};

router.post("/login", (req, res) => {
  let admin = req.body;
  Admin.findOne({
    where: { email: admin.email, password: admin.password },
  })
    .then(function (admin) {
      if (!admin) {
        res.status(401).send({ Error: "Invalid Email or Password" });
      } else {
        //Generate an access token
        const accessToken = generateAccessToken(admin);
        const refreshToken = generateRefreshToken(admin);
        refreshTokens.push(refreshToken);
        res.status(200).send({
          id: admin.id,
          first_name: admin.first_name,
          last_name: admin.last_name,
          roles: admin.roles,
          accessToken,
          refreshToken,
        });
      }
    })
    .catch((error) => {
      console.log("Error", error);
    });
});

router.post("/refresh", (req, res) => {
  // take the refresh token from the user
  const refreshToken = req.body.token;

  //send error if there is no token or it's invalid
  if (!refreshToken) return res.status(401).json("You are not authenticated!");
  if (!refreshTokens.includes(refreshToken)) {
    return res.status(403).send({
      err: "Refresh token is not valid!",
    });
  }
  jwt.verify(refreshToken, "myRefreshSecretKey", (err, admin) => {
    err && console.log(err);
    refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
    const newAccessToken = generateAccessToken(admin);
    const newRefreshToken = generateRefreshToken(admin);
    refreshTokens.push(newRefreshToken);
    res.status(200).send({
      // id: admin.id,
      // first_name: admin.first_name,
      // last_name: admin.last_name,
      // roles: admin.roles,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  });
});

router.post("/logout", verifyAdminToken, (req, res) => {
  const refreshToken = req.body.token;
  refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
  res.status(200).json("You logged out successfully.");
});

router.delete("/user/:userId", verifyAdminToken, (req, res) => {
  res
    .status(200)
    .send({ msg: req.params.userId + " => User has been deleted." });
  // if (req.user.id === req.params.userId || req.user.isAdmin) {
  //   // if roles ...
  //   res.status(200).json("User has been deleted.");
  // } else {
  //   res.status(403).json("You are not allowed to delete this user!");
  // }
});

module.exports = router;

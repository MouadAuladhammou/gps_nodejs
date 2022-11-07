const express = require("express");
var router = express.Router();
var { User } = require("../models/user");
const jwt = require("jsonwebtoken");

router.post("/register", (req, res) => {
  User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  })
    .then((result) => {
      console.log("result.id", result.id);
      let payload = { subject: result.id };
      const token = jwt.sign(payload, "_key_secret_");
      res.status(200).send({ token });
    })
    .catch((error) => {
      console.error("Failed to create a new record : ", error);
    });
});

router.post("/login", (req, res) => {
  let userData = req.body;
  User.findOne({
    where: { email: userData.email, password: userData.password },
  })
    .then(function (user) {
      if (!user) {
        res.status(401).send({ Error: "Invalid Email or Password" });
      } else {
        let payload = { subject: user.id };
        const token = jwt.sign(payload, "_key_secret_");

        // res.cookie("token", token, {
        //   expires: new Date(Date.now() + 10000), // 10 secondes TTL
        //   httpOnly: true,
        // });

        console.log("done");
        res.status(200).send({ token });
      }
    })
    .catch((error) => {
      res.status(500).send({ Error: error });
    });
});

router.get("/all", (req, res) => {
  User
    .findAll
    // {
    // where: { id: req.params.id }
    // }
    ()
    .then(function (result) {
      if (!result) return "not find";
      else res.send(result);
    })
    .catch((error) => {
      console.error("Failed to create a new record : ", error);
    });
});

router.get("/show/:id", (req, res) => {
  User.findOne({
    where: { id: req.params.id },
  })
    .then(function (result) {
      if (!result) return "not find";
      else res.send(result.dataValues);
    })
    .catch((error) => {
      console.error("Failed to create a new record : ", error);
    });
});

router.put("/update/:id", (req, res) => {
  User.update(
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      where: { id: req.params.id },
    }
  )
    .then((result) => {
      res.send("done");
    })
    .catch((error) => {
      console.error("Failed to create a new record : ", error);
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
      console.error("Failed to create a new record : ", error);
    });
});

module.exports = router;

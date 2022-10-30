const express = require("express");
var router = express.Router();
var { User } = require("../models/user");

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

router.post("/new", (req, res) => {
  User.create({
    id: req.body.id,
    name: req.body.name,
    email: req.body.email,
  })
    .then((result) => {
      res.send("done");
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

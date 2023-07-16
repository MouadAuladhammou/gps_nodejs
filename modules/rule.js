const express = require("express");
var router = express.Router();
const { Op } = require("sequelize");
const { Rule } = require("../models/index.js");
const { verifyToken } = require("../middleware/check_token");

router.get("/all", verifyToken, async (req, res) => {
  Rule.findAll({
    where: { user_id: req.userId },
  })
    .then(function (result) {
      if (!result) return "not found";
      else res.send(result);
    })
    .catch((error) => {
      console.error("Error : ", error);
    });
});

router.get("/rule/:id", verifyToken, (req, res) => {
  Rule.findOne({
    where: { id: req.params.id, user_id: req.userId },
  })
    .then(function (result) {
      if (!result) return "not found";
      else res.send(result);
    })
    .catch((error) => {
      console.error("Error : ", error);
    });
});

router.delete("/delete/:id", verifyToken, (req, res) => {
  Rule.destroy({
    where: { id: req.params.id, user_id: req.userId },
  })
    .then(function (rowDeleted) {
      if (rowDeleted === 1) {
        res.sendStatus(200); // Suppression réussie
      } else {
        res.sendStatus(404); // Règle non trouvée
      }
    })
    .catch((error) => {
      console.error("Error : ", error);
      res.status(500); // Erreur interne du serveur
    });
});

router.post("/add", verifyToken, (req, res) => {
  Rule.create({
    name: req.body.name,
    description: req.body.description,
    type: req.body.type,
    value: req.body.value,
    params: req.body.params,
    user_id: req.userId,
  })
    .then((result) => {
      res.status(200).send({
        rule: result,
      });
    })
    .catch((error) => {
      console.error("Failed to create a new record : ", error);
    });
});

router.post("/update/:id", verifyToken, (req, res) => {
  Rule.update(
    {
      name: req.body.name,
      description: req.body.description,
      type: req.body.type,
      value: req.body.value,
      params: req.body.params || null,
    },
    {
      where: { id: req.params.id, user_id: req.userId },
    }
  )
    .then((result) => {
      res.status(200).send({
        rule: result,
      });
    })
    .catch((error) => {
      console.error("Failed to update : ", error);
    });
});

router.get("/name/unique", async (req, res) => {
  const ruleId = parseInt(req.query.id);
  const ruleName = req.query.q;

  const condition = {
    name: ruleName,
  };

  if (ruleId) {
    condition.id = { [Op.ne]: ruleId };
  }

  Rule.findOne({ where: condition })
    .then(function (result) {
      if (!result) res.send(false);
      else res.send(true);
    })
    .catch((error) => {
      console.error("Error : ", error);
    });
});

module.exports = router;

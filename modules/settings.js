const express = require("express");
var router = express.Router();
const { Op } = require("sequelize");
const { Setting, Rule } = require("../models/index.js");
const sequelize = require("../config/mysql");
const { verifyToken } = require("../middleware/check_token");

router.get("/all", verifyToken, async (req, res) => {
  try {
    const settings = await Setting.findAll({
      where: { user_id: req.userId },
      include: "rules",
    });
    res.send(settings);
  } catch (error) {
    console.error("Error: ", error);
    res
      .status(500)
      .send({ error: "Erreur lors de la récupération des settings" });
  }
});

router.get("/setting/:id", verifyToken, (req, res) => {
  Setting.findOne({
    where: { id: req.params.id, user_id: req.userId },
    include: [{ model: Rule, as: "rules" }],
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
  Setting.destroy({
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

router.post("/add", verifyToken, async (req, res) => {
  const rules = req.body.rules;
  const ruleIds = rules.map((rule) => rule.item_id); // IDs des règles à associer
  let transaction;
  try {
    const { name, description } = req.body;
    transaction = await sequelize.transaction();
    const rules = await Rule.findAll({ where: { id: ruleIds }, transaction });
    if (rules.length !== ruleIds.length) {
      throw new Error("Une ou plusieurs règles n'existent pas");
    }

    const setting = await Setting.create(
      {
        name,
        description,
        user_id: req.userId,
      },
      { transaction }
    );

    await setting.addRules(rules, { transaction });
    await transaction.commit();
    res.status(200).send({
      setting,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Échec de la création d'un nouvel enregistrement : ", error);
    res.status(500).send({ error: "Erreur lors de la création du setting" });
  }
});

router.post("/update/:id", verifyToken, async (req, res) => {
  const rules = req.body.rules;
  const ruleIds = rules.map((rule) => rule.item_id); // IDs des règles à associer
  let transaction;
  try {
    const { name, description } = req.body;
    transaction = await sequelize.transaction();
    const rules = await Rule.findAll({
      where: {
        id: ruleIds,
        user_id: req.userId, // Vérifiez si les règles sont pour l'utilisateur actuel
      },
    });
    if (rules.length !== ruleIds.length) {
      throw new Error("Une ou plusieurs règles n'existent pas");
    }

    await Setting.update(
      {
        name,
        description,
      },
      {
        where: { id: req.params.id, user_id: req.userId },
      },
      { transaction }
    );

    const setting = await Setting.findByPk(req.params.id);
    await setting.removeRules(await setting.getRules(), { transaction });

    await setting.addRules(rules, { transaction });
    await transaction.commit();
    res.status(200).send({
      setting,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Échec de la modification de l'enregistrement : ", error);
    res
      .status(500)
      .send({ error: "Erreur lors de la modification du setting" });
  }
});

router.get("/name/unique", async (req, res) => {
  const settingId = parseInt(req.query.id);
  const settingName = req.query.q;

  const condition = {
    name: settingName,
  };

  if (settingId) {
    condition.id = { [Op.ne]: settingId };
  }

  Setting.findOne({ where: condition })
    .then(function (result) {
      if (!result) res.send(false);
      else res.send(true);
    })
    .catch((error) => {
      console.error("Error : ", error);
    });
});

router.post("/status/update/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [updatedRows] = await Setting.update(
      { status },
      { where: { id, user_id: req.userId } }
    );

    if (updatedRows > 0) {
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error("Failed to update: ", error);
    res.sendStatus(500);
  }
});

module.exports = router;

const asyncHandler = require("express-async-handler");
const { sequelize } = require("../config/mysql.js");
const { Op } = require("sequelize");
const { Setting, Rule } = require("../models/index.js");

const getSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.findAll({
    where: { user_id: req.userId },
    include: "rules",
  });
  res.status(200).send(settings);
});

const getSetting = asyncHandler(async (req, res) => {
  const setting = await Setting.findOne({
    where: { id: req.params.id, user_id: req.userId },
    include: [{ model: Rule, as: "rules" }],
  });
  if (!setting) {
    res.status(404);
    throw new Error("Setting not found");
  }
  res.status(200).send(setting);
});

const createSetting = asyncHandler(async (req, res) => {
  const ruleIds = req.body.rules.map((rule) => rule.item_id); // IDs des règles à associer
  let transaction;
  try {
    const { name, description } = req.body;
    transaction = await sequelize.transaction();
    const rules = await Rule.findAll({
      where: { id: ruleIds, user_id: req.userId },
    });
    if (rules.length !== ruleIds.length) {
      res.status(500);
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
    const settingWithRules = await Setting.findByPk(setting.id, {
      include: "rules",
    });

    res.status(201).send({
      setting: settingWithRules,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    res.status(500);
    throw new Error("Erreur lors de la création du setting :", error);
  }
});

const updateSetting = asyncHandler(async (req, res) => {
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
      res.status(500);
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
    const settingWithRules = await Setting.findByPk(setting.id, {
      include: "rules",
    });
    res.status(200).send({
      setting: settingWithRules,
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    res.status(500);
    throw new Error("Échec de la modification de l'enregistrement : ", error);
  }
});

const deleteSetting = asyncHandler(async (req, res) => {
  const rowDeleted = await Setting.destroy({
    where: { id: req.params.id, user_id: req.userId },
  });

  if (rowDeleted) res.status(204).end();
  // Envoie une réponse vide sans corps avec le statut 200
  else {
    res.status(404);
    throw new Error("Setting not found");
  }
});

const checkSettingNameUnique = asyncHandler(async (req, res) => {
  const settingId = parseInt(req.query.id);
  const settingName = req.query.q;

  const condition = {
    name: settingName,
    user_id: req.userId,
  };

  if (settingId) {
    condition.id = { [Op.ne]: settingId };
  }

  const setting = await Setting.findOne({ where: condition });
  setting ? res.status(200).send(true) : res.status(200).send(false);
});

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const [updatedRows] = await Setting.update(
    { status },
    { where: { id, user_id: req.userId } }
  );

  if (updatedRows > 0) {
    res.status(204).end();
  } else {
    res.status(404);
    throw new Error("Setting not found");
  }
});

module.exports = {
  getSettings,
  getSetting,
  createSetting,
  updateSetting,
  deleteSetting,
  checkSettingNameUnique,
  updateStatus,
};

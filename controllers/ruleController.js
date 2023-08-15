const asyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
const { Rule } = require("../models/index.js");

const getRules = asyncHandler(async (req, res) => {
  const rules = await Rule.findAll({
    where: { user_id: req.userId },
  });
  res.status(200).send(rules);
});

const getRule = asyncHandler(async (req, res) => {
  const rule = await Rule.findOne({
    where: { id: req.params.id, user_id: req.userId },
  });

  if (!rule) {
    res.status(404);
    throw new Error("Rule not found");
  }
  res.status(200).send(rule);
});

const createRule = asyncHandler(async (req, res) => {
  const rule = await Rule.create({
    name: req.body.name,
    description: req.body.description,
    type: req.body.type,
    value: req.body.value,
    params: req.body.params,
    user_id: req.userId,
  });
  res.status(201).send(rule);
});

const updateRule = asyncHandler(async (req, res) => {
  const updatedrule = await Rule.update(
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
  );
  res.status(200).send(updatedrule);
});

const deleteRule = asyncHandler(async (req, res) => {
  const rowDeleted = await Rule.destroy({
    where: { id: req.params.id, user_id: req.userId },
  });

  if (rowDeleted) res.status(200).end();
  // Envoie une réponse vide sans corps avec le statut 200
  else {
    res.status(404);
    throw new Error("Rule not found");
  }
});

const checkRuleNameUnique = asyncHandler(async (req, res) => {
  const ruleId = parseInt(req.query.id);
  const ruleName = req.query.q;

  const condition = {
    name: ruleName,
    user_id: req.userId,
  };

  if (ruleId) {
    condition.id = { [Op.ne]: ruleId };
  }

  const rule = await Rule.findOne({ where: condition });
  rule ? res.status(200).send(true) : res.status(200).send(false);
});

module.exports = {
  getRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  checkRuleNameUnique,
};

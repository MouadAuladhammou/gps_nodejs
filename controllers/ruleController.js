const asyncHandler = require("express-async-handler");
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
  try {
    const rule = await Rule.create({
      name: req.body.name,
      description: req.body.description,
      type: req.body.type,
      value: req.body.value,
      params: req.body.params,
      user_id: req.userId,
    });
    res.status(201).send(rule);
  } catch (error) {
    res.status(500);
    throw new Error(
      "Une erreur s'est produite lors de la création de la règle: ",
      error
    );
  }
});

const updateRule = asyncHandler(async (req, res) => {
  try {
    await Rule.update(
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
    const rule = await Rule.findByPk(req.params.id);
    res.status(200).send(rule);
  } catch (error) {
    res.status(500);
    throw new Error(
      "Une erreur s'est produite lors de la modification de la règle: ",
      error
    );
  }
});

const deleteRule = asyncHandler(async (req, res) => {
  const rowDeleted = await Rule.destroy({
    where: { id: req.params.id, user_id: req.userId },
  });

  if (rowDeleted) res.status(204).end();
  // Envoie une réponse vide sans corps avec le statut 200
  else {
    res.status(404);
    throw new Error("Rule not found");
  }
});

module.exports = {
  getRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
};

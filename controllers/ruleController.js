const asyncHandler = require("express-async-handler");
const RuleService = require("../services/ruleService");

const getRules = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const rules = await RuleService.getRules(userId);
    res.status(200).send(rules);
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const getRule = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const ruleId = req.params.id;
    const rule = await RuleService.getRuleById(userId, ruleId);
    if (!rule) {
      res.status(404);
      throw new Error("Rule not found!");
    }
    res.status(200).send(rule);
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const createRule = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const ruleData = req.body;
    const rule = await RuleService.createRule(userId, ruleData);
    res.status(201).send(rule);
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const updateRule = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const ruleId = req.params.id;
    const ruleData = req.body;
    const updatedRule = await RuleService.updateRule(userId, ruleId, ruleData);
    res.status(200).send(updatedRule);
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const deleteRule = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const ruleId = req.params.id;

    const rowDeleted = await RuleService.deleteRule(userId, ruleId);

    if (rowDeleted) {
      res.status(204).end();
    } else {
      res.status(404);
      throw new Error("Rule not found!");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

module.exports = {
  getRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
};

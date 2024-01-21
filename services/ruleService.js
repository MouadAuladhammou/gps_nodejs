const { Rule } = require("../models/index.js");

class RuleService {
  async getRules(userId) {
    try {
      return await Rule.findAll({
        where: { user_id: userId },
      });
    } catch (err) {
      throw new Error("Error while fetching rules: " + err.message);
    }
  }

  async getRuleById(userId, ruleId) {
    try {
      const rule = await Rule.findOne({
        where: { id: ruleId, user_id: userId },
      });

      return rule;
    } catch (err) {
      throw new Error("Error while fetching rule: " + err.message);
    }
  }

  async createRule(userId, ruleData) {
    try {
      const rule = await Rule.create({
        name: ruleData.name,
        description: ruleData.description,
        type: ruleData.type,
        value: ruleData.value,
        params: ruleData.params,
        user_id: userId,
      });

      return rule;
    } catch (err) {
      throw new Error("Error while creating rule: " + err.message);
    }
  }

  async updateRule(userId, ruleId, ruleData) {
    try {
      await Rule.update(
        {
          name: ruleData.name,
          description: ruleData.description,
          type: ruleData.type,
          value: ruleData.value,
          params: ruleData.params || null,
        },
        {
          where: { id: ruleId, user_id: userId },
        }
      );

      const updatedRule = await Rule.findByPk(ruleId);
      return updatedRule;
    } catch (err) {
      throw new Error("Error while updating rule: " + err.message);
    }
  }

  async deleteRule(userId, ruleId) {
    try {
      const rowDeleted = await Rule.destroy({
        where: { id: ruleId, user_id: userId },
      });

      return rowDeleted;
    } catch (err) {
      throw new Error("Error while deleting rule: " + err.message);
    }
  }
}

module.exports = new RuleService();

const { sequelize } = require("../config/mysql.js");
const { Setting, Rule } = require("../models/index.js");

class SettingService {
  async getSettings(userId) {
    try {
      const settings = await Setting.findAll({
        where: { user_id: userId },
        include: "rules",
      });
      return settings;
    } catch (err) {
      throw new Error("Error while fetching settings: " + err.message);
    }
  }

  async getSettingById(userId, settingId) {
    try {
      const setting = await Setting.findOne({
        where: { id: settingId, user_id: userId },
        include: [{ model: Rule, as: "rules" }],
      });
      return setting;
    } catch (err) {
      throw new Error("Error while fetching setting: " + err.message);
    }
  }

  async createSetting(userId, settingData) {
    let transaction;
    try {
      const { name, description, rules } = settingData;

      transaction = await sequelize.transaction();

      const ruleIds = rules.map((rule) => rule.item_id);

      const existingRules = await Rule.findAll({
        where: { id: ruleIds, user_id: userId },
      });

      if (existingRules.length !== ruleIds.length) {
        throw new Error("Une ou plusieurs règles n'existent pas");
      }

      const setting = await Setting.create(
        {
          name,
          description,
          user_id: userId,
        },
        { transaction }
      );

      await setting.addRules(existingRules, { transaction });
      await transaction.commit();

      const settingWithRules = await Setting.findByPk(setting.id, {
        include: "rules",
      });

      return settingWithRules;
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw new Error(
        "Erreur lors de la création du setting : " + error.message
      );
    }
  }

  async updateSetting(userId, settingId, settingData) {
    let transaction;
    try {
      const { name, description, rules } = settingData;

      transaction = await sequelize.transaction();

      const ruleIds = rules.map((rule) => rule.item_id);

      const existingRules = await Rule.findAll({
        where: { id: ruleIds, user_id: userId },
      });

      if (existingRules.length !== ruleIds.length) {
        throw new Error("Une ou plusieurs règles n'existent pas");
      }

      await Setting.update(
        {
          name,
          description,
        },
        {
          where: { id: settingId, user_id: userId },
        },
        { transaction }
      );

      const setting = await Setting.findByPk(settingId);
      await setting.removeRules(await setting.getRules(), { transaction });
      await setting.addRules(existingRules, { transaction });
      await transaction.commit();

      const settingWithRules = await Setting.findByPk(settingId, {
        include: "rules",
      });

      return settingWithRules;
    } catch (error) {
      if (transaction) await transaction.rollback();
      throw new Error(
        "Échec de la modification de l'enregistrement : " + error.message
      );
    }
  }

  async deleteSetting(userId, settingId) {
    try {
      const rowDeleted = await Setting.destroy({
        where: { id: settingId, user_id: userId },
      });

      return rowDeleted;
    } catch (error) {
      throw new Error("Error while deleting setting: " + error.message);
    }
  }

  async updateStatus(userId, settingId, newStatus) {
    try {
      const [updatedRows] = await Setting.update(
        { status: newStatus },
        { where: { id: settingId, user_id: userId } }
      );

      return updatedRows;
    } catch (error) {
      throw new Error("Error while updating setting status: " + error.message);
    }
  }
}

module.exports = new SettingService();

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/mysql");

const SettingRule = sequelize.define(
  "setting_rules",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    setting_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "setting_id",
    },
    rule_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "rule_id",
    },
  },
  { timestamps: false }
);

module.exports = { SettingRule };

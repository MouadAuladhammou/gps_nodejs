const { DataTypes } = require("sequelize");
const sequelize = require("../config/mysql");

const Group = sequelize.define(
  "groupes",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: "users",
      referencesKey: "id",
    },
    setting_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: "settings",
      referencesKey: "id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  { timestamps: false }
);

module.exports = { Group };

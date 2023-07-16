const { DataTypes } = require("sequelize");
const sequelize = require("../config/mysql");

const Rule = sequelize.define(
  "rules",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    params: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      readOnly: true, // Définir la colonne comme non modifiable
    },
  },
  { timestamps: false }
);

module.exports = { Rule };

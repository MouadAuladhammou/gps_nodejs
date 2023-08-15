const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/mysql");

const Setting = sequelize.define(
  "settings",
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
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      readOnly: true, // Définir la colonne comme non modifiable
    },
  },
  { timestamps: false }
);

module.exports = { Setting };

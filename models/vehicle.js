const { DataTypes } = require("sequelize");
const sequelize = require("../config/mysql");

const Vehicle = sequelize.define(
  "vehicles",
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
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: "companies",
      referencesKey: "id",
    },
    make: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mileage: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  { timestamps: false }
);

module.exports = { Vehicle };

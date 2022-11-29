const { DataTypes } = require("sequelize");
const sequelize = require("../config/mysql");

// Models
var { Vehicle } = require("../models/vehicle");

const Company = sequelize.define(
  "companies",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: "users",
      referencesKey: "id",
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    company_address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    company_website: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    company_description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  { timestamps: false }
);

// Set relationship
Company.hasMany(Vehicle, {
  foreignKey: "company_id",
  as: "vehicles",
});

module.exports = { Company };

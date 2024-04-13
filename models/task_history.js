const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/mysql");

const TaskHistory = sequelize.define(
  "tasks_histories",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    vehicle_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: "vehicles",
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
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    polygon_start: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    polygon_start_only: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    polygon_start_desc: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    polygon_start_coordinates: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    polygon_destination: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    polygon_destination_desc: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    polygon_destination_coordinates: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date_time_start_From: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    date_time_start_to: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    date_time_end_From: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    date_time_end_to: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: "users",
      referencesKey: "id",
    },
  },
  { timestamps: false }
);

module.exports = { TaskHistory };

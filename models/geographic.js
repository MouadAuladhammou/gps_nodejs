const { DataTypes } = require("sequelize");
const sequelize = require("../config/mysql");
const mongoose = require("mongoose");

// Model sql
const GeoParameter = sequelize.define(
  "geo_parameters",
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
    // reference: {
    //   type: DataTypes.INTEGER,
    //   allowNull: false,
    // },
  },
  { timestamps: false }
);

// Model GeoConfiguration
// Récupérer tous les éléments de configuration (points, lignes et polygons)
const GeoConfiguration = mongoose.model("geo_configurations", {
  user_id: { type: Number, unique: true },
  points: [
    {
      type: { type: String },
      properties: {
        id: Number,
        desc: String,
      },
      geometry: {
        type: { type: String },
        coordinates: [Number],
      },
      _id: false,
    },
  ],
  polygons: [
    {
      type: { type: String },
      properties: {
        id: Number,
        desc: String,
        stroke: String,
        "stroke-width": Number,
        "stroke-opacity": Number,
        fill: String,
        "fill-opacity": Number,
        name: String,
      },
      geometry: {
        type: { type: String },
        coordinates: [[[Number]]],
      },
      _id: false,
    },
  ],
  lines: [
    {
      type: { type: String },
      properties: {
        id: Number,
        desc: String,
        color: String,
        weight: Number,
      },
      geometry: {
        type: { type: String },
        coordinates: [[Number]],
      },
      _id: false,
    },
  ],
});

module.exports = { GeoParameter, GeoConfiguration };

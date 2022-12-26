const { DataTypes } = require("sequelize");
const sequelize = require("../config/mysql");

// Models
var { Vehicle } = require("../models/vehicle");
var { Company } = require("../models/company");
var { GeoParameter } = require("../models/geographic");

const User = sequelize.define(
  "users",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cin: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    postal_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cell_phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    work_phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.BOOLEAN,
      // allowNull: false,
    },
    has_company: {
      type: DataTypes.BOOLEAN,
      // allowNull: false,
    },
  },
  { timestamps: false }
);

// Set relationship
User.hasMany(Company, {
  foreignKey: "user_id",
  as: "companies",
});

User.hasOne(Vehicle, {
  foreignKey: "user_id",
  as: "vehicle",
});

User.hasOne(GeoParameter, {
  foreignKey: "user_id",
  as: "geo_parameter",
});

module.exports = { User };

/* 
// C'est juste créer une table si elle n'existe pas
sequelize.sync().then(() => {
  console.log('Book table created successfully!');
}).catch((error) => {
  console.error('Unable to create table : ', error);
}); 
*/

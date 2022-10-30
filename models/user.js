const { DataTypes } = require("sequelize");
const sequelize = require("../config/mysql");

const User = sequelize.define("users", {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
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

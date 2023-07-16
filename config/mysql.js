const Sequelize = require("sequelize");
const sequelize = new Sequelize("gpsdb", "root", "123456", {
  host: "localhost",
  dialect: "mysql",
});

// se connecter à mysql
sequelize
  .authenticate()
  .then(() => {
    console.log("Mysql Connection has been established successfully.");
  })
  .catch((error) => {
    console.error("Unable to connect to the database: ", error);
  });

module.exports = sequelize;

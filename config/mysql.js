const Sequelize = require("sequelize");
const sequelize = new Sequelize(
  "gpsdb",
  "root",
  "d+l5H)@tv6t6p@8Fv1271V;b3^IY5msS+824yi",
  {
    host: "localhost",
    dialect: "mysql",
  }
);

// Fonction pour se connecter à MySQL
async function connectMySQL() {
  try {
    await sequelize.authenticate();
    console.log("Mysql Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    throw error; // Rejeter l'erreur pour la gérer à un niveau supérieur
  }
}

module.exports = { sequelize, connectMySQL };

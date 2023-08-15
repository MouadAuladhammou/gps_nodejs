const mongoose = require("mongoose");

// Fonction pour se connecter à Mongodb
async function connectMongoDB() {
  try {
    await mongoose.connect(
      "mongodb://admin:adminpassword@64.226.124.200:27017/db_gps"
    );
    console.log("MongoDB connection succeeded.");
  } catch (error) {
    console.error("Error in DB connection:", error);
    throw error; // Rejeter l'erreur pour la gérer à un niveau supérieur
  }
}

module.exports = connectMongoDB;

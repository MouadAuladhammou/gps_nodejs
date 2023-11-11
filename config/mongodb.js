const mongoose = require("mongoose");

// Fonction pour se connecter à Mongodb
async function connectMongoDB() {
  try {
    await mongoose.connect(
      "mongodb://admin:adminpassword@10.114.0.2:27017/db_gps" // On peut utiliser ip privé VPC ici si on a un load balancing entre plusieurs serveurs
    );
    console.log("MongoDB connection succeeded.");
  } catch (error) {
    console.error("Error in DB connection:", error);
    throw error; // Rejeter l'erreur pour la gérer à un niveau supérieur
  }
}

module.exports = connectMongoDB;

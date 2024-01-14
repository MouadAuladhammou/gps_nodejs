const mongoose = require("mongoose");

// Encodez le mot de passe avec encodeURIComponent
const encodedPassword = encodeURIComponent("d+l5H)@tv6t6p@8FvKDJFL-ts@{dq24J");

// Fonction pour se connecter à Mongodb
async function connectMongoDB() {
  try {
    await mongoose.connect(
      `mongodb://admin:${encodedPassword}@localhost:27017/db_gps` // On peut utiliser ip privé VPC ici si on a un load balancing entre plusieurs serveurs
    );
    console.log("MongoDB connection succeeded.");
  } catch (error) {
    console.error("Error in DB connection:", error);
    throw error; // Rejeter l'erreur pour la gérer à un niveau supérieur
  }
}

module.exports = { connectMongoDB, mongoose };

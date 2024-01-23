const asyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
const { Vehicle } = require("../models/index.js");
const VehicleService = require("../services/vehicleService");
const { getCurrentUser } = require("../services/userService");

// Admin (Methode 1) // => Obsolète
const checkVehicleData = asyncHandler(async (req, res) => {
  const { imei, registration_number } = req.body;
  try {
    const existingVehicle = await Vehicle.findOne({
      where: {
        [Op.or]: [{ imei }, { registration_number }],
      },
    });

    if (existingVehicle) {
      // Trouver le champ spécifique qui existe déjà
      const existingField = Object.keys(req.body).find(
        (key) => existingVehicle[key] === req.body[key]
      );

      res.status(200).send({
        exists: true,
        existingField,
      });
    } else {
      res.status(200).send({
        exists: false,
      });
    }
  } catch (e) {
    res.status(500);
    throw new Error("Échec", e.message);
  }
});

// Admin (Methode 2)
const createAndCheckVehicle = asyncHandler(async (req, res) => {
  try {
    // Essayer d'insérer le véhicule
    const vehicle = await VehicleService.create(req.body);
    res.status(201).send(vehicle);
  } catch (error) {
    // Vérifier si l'erreur est liée à une violation d'unicité dans MySQL
    if (error.name === "SequelizeUniqueConstraintError") {
      const existingField =
        error.fields.imei !== undefined ? "imei" : "registration_number";

      res.status(409).send({
        exists: true,
        existingField,
      });
    } else {
      // Une autre erreur s'est produite
      console.error("Erreur lors de la création du véhicule", error);
      res.status(500);
      throw new Error("Internal Server Error");
    }
  }
});

// Admin
const updateAndCheckVehicle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    // NB: Si la mise à jour réussit, renvoyer les données complètes de l'utilisateur concerné
    //  car si un groupe de véhicules est modifié, il faut récupérer à nouveau les données pour les afficher correctement sur l'interface utilisateur (back office).
    const user_id = await VehicleService.update(id, req.body);
    if (user_id) {
      const user = await getCurrentUser(user_id);
      res.status(200).send(user);
    } else {
      res.status(404);
      throw new Error("Utilisateur non trouvé!");
    }
  } catch (error) {
    // Vérifier si l'erreur est liée à une violation d'unicité dans MySQL
    if (error.name === "SequelizeUniqueConstraintError") {
      const existingField =
        error.fields.imei !== undefined ? "imei" : "registration_number";

      res.status(409).send({
        exists: true,
        existingField,
      });
    } else {
      // Une autre erreur s'est produite
      console.error("Erreur lors de la mise à jour du véhicule", error);
      res.status(500);
      throw new Error("Internal Server Error" + error);
    }
  }
});

// Admin
const deleteVehicle = asyncHandler(async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const isDeleted = await VehicleService.remove(vehicleId);

    if (isDeleted) {
      res.status(204).end();
    } else {
      res.status(404);
      throw new Error("Vehicle not found!");
    }
  } catch (error) {
    res.status(500);
    throw new Error("Internal Server Error", error);
  }
});

// User
const changeGroupVehicle = asyncHandler(async (req, res) => {
  try {
    const { id: vehicleId } = req.params;
    const { groupId } = req.body;

    const groupsWithVehicles = await VehicleService.changeGroupVehicle(
      vehicleId,
      groupId,
      req.userId
    );

    res.status(200).send({ groupsWithVehicles });
  } catch (error) {
    console.error("Erreur lors du changement de groupe de véhicule", error);
    res.status(500);
    throw new Error("Internal Server Error", error);
  }
});

module.exports = {
  deleteVehicle,
  checkVehicleData,
  createAndCheckVehicle,
  updateAndCheckVehicle,
  changeGroupVehicle,
};

const asyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
const { Group, Vehicle, User } = require("../models/index.js");

// Admin (Methode 1)
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
  const {
    imei,
    registration_number,
    groupe_id,
    make,
    model,
    year,
    mileage,
    type,
  } = req.body;
  try {
    // Essayer d'insérer le véhicule
    const vehicle = await Vehicle.create({
      imei,
      groupe_id,
      make,
      model,
      year,
      mileage,
      type,
      registration_number,
    });

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
  const {
    imei,
    registration_number,
    groupe_id,
    make,
    model,
    year,
    mileage,
    type,
  } = req.body;

  try {
    // NB: Si la mise à jour réussit, renvoyer les données complètes de l'utilisateur concerné
    //  car si un groupe de véhicules est modifié, il faut récupérer à nouveau les données pour les afficher correctement sur l'interface utilisateur (back office).

    // Récupérer le user_id à partir de la table "groupes"
    const groupe = await Group.findOne({
      attributes: ["user_id"],
      where: {
        id: groupe_id,
      },
    });

    if (!groupe) {
      // Gérer le cas où le groupe n'est pas trouvé
      res.status(404);
      throw new Error("Groupe non trouvé.");
    }

    const user_id = groupe.user_id;

    // Essayer de mettre à jour le véhicule
    await Vehicle.update(
      {
        imei,
        groupe_id,
        make,
        model,
        year,
        mileage,
        type,
        registration_number,
      },
      {
        where: { id },
      }
    );

    const user = await User.findOne({
      where: { id: user_id },
      include: [
        {
          model: Group,
          as: "groupes",
          include: [
            {
              model: Vehicle,
              as: "vehicles",
            },
          ],
        },
      ],
    });
    res.status(200).send(user);
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
      throw new Error("Internal Server Error");
    }
  }
});

// Admin
const deleteVehicle = asyncHandler(async (req, res) => {
  const rowDeleted = await Vehicle.destroy({
    where: { id: req.params.id },
  });
  if (rowDeleted) res.status(200).end();
  else {
    res.status(404);
    throw new Error("Group not found");
  }
});

module.exports = {
  deleteVehicle,
  checkVehicleData,
  createAndCheckVehicle,
  updateAndCheckVehicle,
};

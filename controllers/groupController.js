const asyncHandler = require("express-async-handler");
const { Setting, Group, Vehicle } = require("../models/index.js");

const getGroupsWithVehicles = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const groupsWithVehicles = await Group.findAll({
    attributes: ["id", "user_id", "name", "vehicles.imei"], // Sélectionnez les attributs à inclure dans le résultat
    where: { user_id: userId },
    order: [["name", "ASC"]], // Trier des résultats par nom dans l'ordre croissant
    include: [
      {
        model: Vehicle,
        as: "vehicles",
        attributes: [
          "id",
          "groupe_id",
          "imei",
          "make",
          "model",
          "year",
          "mileage",
          "type",
          "registration_number",
        ],
      },
      {
        model: Setting,
        as: "setting",
        attributes: ["id", "name", "description"],
      },
    ],
    // limit: 10, // Limitez le nombre de résultats à 10
  });

  if (groupsWithVehicles) {
    res.status(200).send({ groupsWithVehicles });
  } else {
    res.status(404);
    throw new Error("Group not found");
  }
});

module.exports = {
  getGroupsWithVehicles,
};

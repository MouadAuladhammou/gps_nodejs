const express = require("express");
var router = express.Router();
const { Setting, Group, Vehicle } = require("../models/index.js");

// récupérer tous les éléments pour "recap" (groupes avec ses vehicles )
router.get("/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
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
    })
      .then((result) => {
        // Traiter les résultats
        return result;
      })
      .catch((error) => {
        // Gérer les erreurs
        console.error(error);
      });

    if (groupsWithVehicles) res.send({ groupsWithVehicles });
  } catch (error) {
    console.log("error", error);
    return res.status(500).send({ error });
  }
});

module.exports = router;

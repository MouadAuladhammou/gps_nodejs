const { Group, Vehicle, Setting } = require("../models/index.js");

class VehicleService {
  async create(vehicle) {
    return await Vehicle.create({
      imei: vehicle.imei,
      groupe_id: vehicle.groupe_id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      mileage: vehicle.mileage,
      type: vehicle.type,
      registration_number: vehicle.registration_number,
    });
  }

  async update(id, data) {
    const {
      imei,
      registration_number,
      groupe_id,
      make,
      model,
      year,
      mileage,
      type,
    } = data;

    // Récupérer le user_id à partir de la table "groupes"
    const groupe = await Group.findOne({
      attributes: ["user_id"],
      where: {
        id: groupe_id,
      },
    });

    if (!groupe) {
      // Gérer le cas où le groupe n'est pas trouvé
      throw new Error("Groupe non trouvé!");
    }

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

    return groupe.user_id || null;
  }

  async remove(vehicleId) {
    const rowDeleted = await Vehicle.destroy({
      where: { id: vehicleId },
    });
    return !!rowDeleted;
  }

  async changeGroupVehicle(vehicleId, groupId, userId) {
    const group = await Group.findOne({
      attributes: ["user_id"],
      where: {
        id: groupId,
        user_id: userId,
      },
    });

    if (!group) {
      throw new Error("Groupe non trouvé!");
    }

    const vehicle = await Vehicle.findOne({
      where: { id: vehicleId },
      include: [
        {
          model: Group,
          as: "group",
          attributes: ["user_id"],
        },
      ],
    });

    if (!vehicle || vehicle.group.user_id !== userId) {
      throw new Error("Groupe ou Véhicule non trouvé!");
    }

    await Vehicle.update(
      {
        groupe_id: groupId,
      },
      {
        where: { id: vehicleId },
      }
    );

    const groupsWithVehicles = await Group.findAll({
      attributes: ["id", "user_id", "name", "description", "vehicles.imei"],
      where: { user_id: userId },
      order: [["name", "ASC"]],
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
    });

    return groupsWithVehicles;
  }
}

module.exports = new VehicleService();

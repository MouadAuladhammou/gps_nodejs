const asyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
const { Setting, Group, Vehicle } = require("../models/index.js");

const getGroupsWithVehicles = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const groupsWithVehicles = await Group.findAll({
    attributes: ["id", "user_id", "name", "description", "vehicles.imei"], // Sélectionnez les attributs à inclure dans le résultat
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

const getGroup = asyncHandler(async (req, res) => {
  const group = await Group.findOne({
    where: { id: req.params.id, user_id: req.userId },
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
  if (!group) {
    res.status(404);
    throw new Error("Setting not found");
  }
  res.status(200).send(group);
});

const updateGroup = asyncHandler(async (req, res) => {
  const { name, description, setting: newSetting } = req.body;
  const groupId = req.params.id;

  try {
    if (newSetting) {
      const setting = await Setting.findOne({
        where: {
          id: newSetting.id,
          user_id: req.userId,
        },
      });

      if (!setting) {
        res.status(404);
        throw new Error("Le paramétre spécifiée n'existe pas");
      }
    }

    await Group.update(
      {
        name,
        description,
        setting_id: newSetting ? newSetting.id : null, // Assigne l'ID de la parametre si elle est spécifiée, sinon null
      },
      {
        where: { id: groupId, user_id: req.userId },
      }
    );

    const group = await Group.findByPk(groupId, { include: "setting" });
    res.status(200).send({
      group,
    });
  } catch (error) {
    res.status(500);
    throw new Error("Échec de la modification de l'enregistrement", error);
  }
});

// Admin
const createGroup = asyncHandler(async (req, res) => {
  try {
    const group = await Group.create({
      user_id: req.body.user_id,
      name: req.body.name,
      description: req.body.description,
    });
    res.status(201).send(group);
  } catch (error) {
    res.status(500);
    throw new Error(
      "Une erreur s'est produite lors de la création du groupe: ",
      error
    );
  }
});

// User
const createGroupByUser = asyncHandler(async (req, res) => {
  const { name, description, setting: newSetting } = req.body;
  try {
    if (newSetting) {
      const setting = await Setting.findOne({
        where: {
          id: newSetting.id,
          user_id: req.userId,
        },
      });

      if (!setting) {
        res.status(404);
        throw new Error("Le paramétre spécifiée n'existe pas");
      }
    }

    const group = await Group.create({
      user_id: req.userId,
      name,
      description,
      setting_id: newSetting ? newSetting.id : null, // Assigne l'ID de la parametre si elle est spécifiée, sinon null
    });
    res.status(201).send(group);
  } catch (error) {
    res.status(500);
    throw new Error(
      "Une erreur s'est produite lors de la création du groupe: ",
      error
    );
  }
});

// Admin
const deleteGroup = asyncHandler(async (req, res) => {
  const rowDeleted = await Group.destroy({
    where: { id: req.params.id },
  });
  if (rowDeleted) res.status(200).end();
  else {
    res.status(404);
    throw new Error("Group not found");
  }
});

// User
const deleteGroupByUser = asyncHandler(async (req, res) => {
  const rowDeleted = await Group.destroy({
    where: { id: req.params.id, user_id: req.userId },
  });
  if (rowDeleted) res.status(200).end();
  else {
    res.status(404);
    throw new Error("Group not found");
  }
});

const checkGroupNameUnique = asyncHandler(async (req, res) => {
  const groupId = parseInt(req.query.id);
  const groupName = req.query.q;

  const condition = {
    name: groupName,
    user_id: req.userId,
  };

  if (groupId) {
    condition.id = { [Op.ne]: groupId };
  }

  const group = await Group.findOne({ where: condition });
  group ? res.status(200).send(true) : res.status(200).send(false);
});

module.exports = {
  getGroupsWithVehicles,
  getGroup,
  updateGroup,
  checkGroupNameUnique,
  createGroup,
  deleteGroup,
  deleteGroupByUser,
  createGroupByUser,
};

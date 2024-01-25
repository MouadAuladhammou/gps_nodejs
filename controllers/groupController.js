const asyncHandler = require("express-async-handler");
const GroupService = require("../services/groupService");

const updateGroup = asyncHandler(async (req, res) => {
  const { name, description, setting: newSetting } = req.body;
  const groupId = req.params.id;
  const userId = req.userId;
  try {
    const updatedGroup = await GroupService.update(
      groupId,
      userId,
      name,
      description,
      newSetting
    );
    res.status(200).send({
      group: updatedGroup,
    });
  } catch (err) {
    res.status(500);
    throw new Error("Échec de la modification de groupe: " + err.message);
  }
});

// Admin
const createGroupByAdmin = asyncHandler(async (req, res) => {
  try {
    const group = await GroupService.createGroupByAdmin(req.body);
    res.status(201).send(group);
  } catch (err) {
    res.status(500);
    throw new Error(
      "Une erreur s'est produite lors de la création du groupe: " + err.message
    );
  }
});

// User
const createGroupByUser = asyncHandler(async (req, res) => {
  try {
    const group = await GroupService.createGroupByUser(req.userId, req.body);
    res.status(201).send(group);
  } catch (err) {
    res.status(500);
    throw new Error(
      "Une erreur s'est produite lors de la création du groupe: " + err.message
    );
  }
});

// Admin
const deleteGroupByAdmin = asyncHandler(async (req, res) => {
  try {
    await GroupService.deleteGroupByAdmin(req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(404);
    throw new Error("Group not found!");
  }
});

// User
const deleteGroupByUser = asyncHandler(async (req, res) => {
  try {
    await GroupService.deleteGroupByUser(req.params.id, req.userId);
    res.status(204).end();
  } catch (err) {
    res.status(404);
    throw new Error("Group not found!");
  }
});

module.exports = {
  updateGroup,
  createGroupByAdmin,
  deleteGroupByAdmin,
  deleteGroupByUser,
  createGroupByUser,
};

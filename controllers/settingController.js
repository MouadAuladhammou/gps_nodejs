const asyncHandler = require("express-async-handler");
const SettingService = require("../services/settingService");

const getSettings = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const settings = await SettingService.getSettings(userId);
    res.status(200).send(settings);
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const getSetting = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const settingId = req.params.id;
    const setting = await SettingService.getSettingById(userId, settingId);
    if (!setting) {
      res.status(404);
      throw new Error("Setting not found!");
    }
    res.status(200).send(setting);
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const createSetting = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const settingData = req.body;

    const createdSetting = await SettingService.createSetting(
      userId,
      settingData
    );

    res.status(201).send({
      setting: createdSetting,
    });
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const updateSetting = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const settingId = req.params.id;
    const settingData = req.body;

    const updatedSetting = await SettingService.updateSetting(
      userId,
      settingId,
      settingData
    );

    res.status(200).send({
      setting: updatedSetting,
    });
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const deleteSetting = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const settingId = req.params.id;
    const rowDeleted = await SettingService.deleteSetting(userId, settingId);
    if (rowDeleted) {
      res.status(204).end();
    } else {
      res.status(404);
      throw new Error("Setting not found!");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const updateStatus = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const settingId = req.params.id;
    const newStatus = req.body.status;

    const updatedRows = await SettingService.updateStatus(
      userId,
      settingId,
      newStatus
    );

    if (updatedRows > 0) {
      res.status(204).end();
    } else {
      res.status(404);
      throw new Error("Setting not found!");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

module.exports = {
  getSettings,
  getSetting,
  createSetting,
  updateSetting,
  deleteSetting,
  updateStatus,
};

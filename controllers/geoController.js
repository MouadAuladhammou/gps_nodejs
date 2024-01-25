const asyncHandler = require("express-async-handler");
const GeoService = require("../services/geoService");

const getGeoConfiguration = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const geoJson = await GeoService.getGeoConfiguration(userId);
    if (geoJson) {
      res.status(200).send({
        geoJson,
      });
    } else {
      res.status(404);
      throw new Error("Config not found!");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const createPoint = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const pointJson = req.body;
    const config = await GeoService.createPoint(userId, pointJson);
    if (config) {
      res.status(204).end();
    } else {
      res.status(404);
      throw new Error("Config not found!");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const createPolygon = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const polygonJson = req.body;
    const config = await GeoService.createPolygon(userId, polygonJson);
    if (config) {
      res.status(204).end();
    } else {
      res.status(404);
      throw new Error("Config not found!");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const createLine = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const lineJson = req.body;
    const config = await GeoService.createLine(userId, lineJson);
    if (config) {
      res.status(204).end();
    } else {
      res.status(404);
      throw new Error("Config not found!");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const updateContentPopup = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const data = req.body;
    const config = await GeoService.updateContentPopup(userId, data);
    if (config) {
      res.status(204).end();
    } else {
      res.status(404);
      throw new Error("Config not found!");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const updatePoint = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const dataJson = req.body.dataJson;
    const config = await GeoService.updatePoint(userId, dataJson);
    if (config) {
      res.status(204).end();
    } else {
      res.status(404);
      throw new Error("Config not found!");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const updatePolygon = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const dataJson = req.body.dataJson;
    const config = await GeoService.updatePolygon(userId, dataJson);
    if (config) {
      res.status(204).end();
    } else {
      res.status(404);
      throw new Error("Config not found!");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const updateLine = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const dataJson = req.body.dataJson;
    const config = await GeoService.updateLine(userId, dataJson);
    if (config) {
      res.status(204).end();
    } else {
      res.status(404);
      throw new Error("Config not found!");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const deleteGeoConfiguration = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const data = req.body;
    const result = await GeoService.deleteGeoConfiguration(
      userId,
      data.type,
      data.id
    );
    if (result) {
      res.status(204).end();
    } else {
      res.status(404).send("Config not found!");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

module.exports = {
  getGeoConfiguration,
  createPoint,
  createPolygon,
  createLine,
  updateContentPopup,
  updatePoint,
  updatePolygon,
  updateLine,
  deleteGeoConfiguration,
};

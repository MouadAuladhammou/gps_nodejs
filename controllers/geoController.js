const asyncHandler = require("express-async-handler");
var { GeoConfiguration } = require("../models/geographic");

const getGeoConfiguration = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const geoJson = await GeoConfiguration.findOne({ user_id: userId });
  if (geoJson) {
    res.status(200).send({
      geoJson,
    });
  } else {
    res.status(404);
    throw new Error("Config not found");
  }
});

const createPoint = asyncHandler(async (req, res) => {
  const pointJson = req.body;
  const config = await GeoConfiguration.findOneAndUpdate(
    { user_id: req.userId },
    {
      $push: {
        points: pointJson,
      },
    }
  );

  if (config) {
    res.status(200).end();
  } else {
    res.status(404);
    throw new Error("Config not found");
  }
});

const createPolygon = asyncHandler(async (req, res) => {
  const polygonJson = req.body;
  const config = await GeoConfiguration.findOneAndUpdate(
    { user_id: req.userId },
    {
      $push: {
        polygons: polygonJson,
      },
    }
  );

  if (config) {
    res.status(200).end();
  } else {
    res.status(404);
    throw new Error("Config not found");
  }
});

const createLine = asyncHandler(async (req, res) => {
  const lineJson = req.body;
  const config = await GeoConfiguration.findOneAndUpdate(
    { user_id: req.userId },
    {
      $push: {
        lines: lineJson,
      },
    }
  );

  if (config) {
    res.status(200).end();
  } else {
    res.status(404);
    throw new Error("Config not found");
  }
});

const updateContentPopup = asyncHandler(async (req, res) => {
  const data = req.body;
  let config = null;

  switch (data.type) {
    case "point":
      config = await GeoConfiguration.findOneAndUpdate(
        { user_id: req.userId, "points.properties.id": data.id },
        { $set: { "points.$.properties.desc": data.contentText } }
      );
      break;

    case "polygon":
      config = await GeoConfiguration.findOneAndUpdate(
        { user_id: req.userId, "polygons.properties.id": data.id },
        { $set: { "polygons.$.properties.desc": data.contentText } }
      );
      break;

    case "line":
      config = await GeoConfiguration.findOneAndUpdate(
        { user_id: req.userId, "lines.properties.id": data.id },
        { $set: { "lines.$.properties.desc": data.contentText } }
      );
      break;

    default:
      res.status(400).send("Invalid type");
      return;
  }

  if (config) {
    res.status(200).end();
  } else {
    res.status(404);
    throw new Error("Config not found");
  }
});

const updatePoint = asyncHandler(async (req, res) => {
  const data = req.body;
  const config = await GeoConfiguration.findOneAndUpdate(
    {
      user_id: req.userId,
      "points.properties.id": data.dataJson.properties.id,
    },
    {
      $set: {
        "points.$.geometry.coordinates": data.dataJson.geometry.coordinates,
      },
    }
  );

  if (config) {
    res.status(200).end();
  } else {
    res.status(404);
    throw new Error("Config not found");
  }
});

const updatePolygon = asyncHandler(async (req, res) => {
  const data = req.body;
  const config = await GeoConfiguration.findOneAndUpdate(
    {
      user_id: req.userId,
      "polygons.properties.id": data.dataJson.properties.id,
    },
    {
      $set: {
        "polygons.$.geometry.coordinates": data.dataJson.geometry.coordinates,
      },
    }
  );

  if (config) {
    res.status(200).end();
  } else {
    res.status(404);
    throw new Error("Config not found");
  }
});

const updateLine = asyncHandler(async (req, res) => {
  const data = req.body;
  const config = await GeoConfiguration.findOneAndUpdate(
    {
      user_id: req.userId,
      "lines.properties.id": data.dataJson.properties.id,
    },
    {
      $set: {
        "lines.$.geometry.coordinates": data.dataJson.geometry.coordinates,
      },
    }
  );

  if (config) {
    res.status(200).end();
  } else {
    res.status(404);
    throw new Error("Config not found");
  }
});

const deleteGeoConfiguration = asyncHandler(async (req, res) => {
  const data = req.body;
  let result;

  switch (data.type) {
    case "point":
      result = await GeoConfiguration.findOneAndUpdate(
        { user_id: req.userId },
        {
          $pull: {
            points: {
              "properties.id": data.id,
            },
          },
        }
      );
      break;

    case "polygon":
      result = await GeoConfiguration.findOneAndUpdate(
        { user_id: req.userId },
        {
          $pull: {
            polygons: {
              "properties.id": data.id,
            },
          },
        }
      );
      break;

    case "line":
      result = await GeoConfiguration.findOneAndUpdate(
        { user_id: req.userId },
        {
          $pull: {
            lines: {
              "properties.id": data.id,
            },
          },
        }
      );
      break;
  }

  if (result) {
    res.send(result);
  } else {
    res.status(404).send("GeoConfiguration not found");
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

const express = require("express");
var router = express.Router();
// var ObjectId = require("mongoose").Types.ObjectId;
var { GeoConfiguration, GeoParameter } = require("../models/geographic");

router.post("/store/parameter", (req, res) => {
  GeoParameter.create({
    user_id: req.body.user_id,
    //reference: req.body.reference,
    created_at: new Date(),
  })
    .then((result) => {
      res.send("done");
    })
    .catch((error) => {
      console.error("Failed to create a new record: ", error);
    });
});

// ===================================================[GETA CONFIG GEOJSON]=================================================== //
// récupérer tous les éléments geoJson
router.get("/configuration/:id", async (req, res) => {
  const userId = req.params.id;
  const geoJson = await GeoConfiguration.findOne({ user_id: userId });
  if (geoJson) res.send({ geoJson });
});

// ===================================================[STORE]=================================================== //
// store point
router.post("/store/configuration/point", (req, res) => {
  const pointJson = req.body;
  GeoConfiguration.findOneAndUpdate(
    { user_id: 1 },
    {
      $push: {
        points: pointJson,
      },
    },
    (err, result) => {
      if (err) console.error("Failed to create a new record: \n", err);
      if (result) res.send(result);
    }
  );
});

// store polygon
router.post("/store/configuration/polygon", (req, res) => {
  const polygonJson = req.body;
  GeoConfiguration.findOneAndUpdate(
    { user_id: 1 },
    {
      $push: {
        polygons: polygonJson,
      },
    },
    (err, result) => {
      if (err) console.error("Failed to create a new record: \n", err);
      if (result) res.send(result);
    }
  );
});

// store line
router.post("/store/configuration/line", (req, res) => {
  const lineJson = req.body;
  GeoConfiguration.findOneAndUpdate(
    { user_id: 1 },
    {
      $push: {
        lines: lineJson,
      },
    },
    (err, result) => {
      if (err) console.error("Failed to create a new record: \n", err);
      if (result) res.send(result);
    }
  );
});

// ===================================================[POPUP]=================================================== //
// set popup
router.put("/layer/popup", (req, res) => {
  console.log("popup");
  const item = req.body;
  console.log("lineJson", item);
  switch (item.type) {
    case "point":
      GeoConfiguration.findOneAndUpdate(
        { user_id: item.userId, "points.properties.id": item.id },
        { $set: { "points.$.properties.desc": item.contentText } },
        (err, result) => {
          if (err) console.error("Failed to create a new record: \n", err);
          if (result) res.send(result);
        }
      );
      break;

    case "polygon":
      GeoConfiguration.findOneAndUpdate(
        { user_id: item.userId, "polygons.properties.id": item.id },
        { $set: { "polygons.$.properties.desc": item.contentText } },
        (err, result) => {
          if (err) console.error("Failed to create a new record: \n", err);
          if (result) res.send(result);
        }
      );
      break;

    case "line":
      GeoConfiguration.findOneAndUpdate(
        { user_id: item.userId, "lines.properties.id": item.id },
        { $set: { "lines.$.properties.desc": item.contentText } },
        (err, result) => {
          if (err) console.error("Failed to create a new record: \n", err);
          if (result) res.send(result);
        }
      );
      break;
  }
});

// ===================================================[UPDATE]=================================================== //
// update point
router.put("/update/configuration/point", (req, res) => {
  const item = req.body;
  console.log("lineJson", item);
  GeoConfiguration.findOneAndUpdate(
    {
      user_id: item.userId,
      "points.properties.id": item.dataJson.properties.id,
    },
    {
      $set: {
        "points.$.geometry.coordinates": item.dataJson.geometry.coordinates,
      },
    },
    (err, result) => {
      if (err) console.error("Failed to create a new record: \n", err);
      if (result) res.send(result);
    }
  );
});

// update polygon
router.put("/update/configuration/polygon", (req, res) => {
  const item = req.body;
  console.log("polygonJson", item);
  GeoConfiguration.findOneAndUpdate(
    {
      user_id: item.userId,
      "polygons.properties.id": item.dataJson.properties.id,
    },
    {
      $set: {
        "polygons.$.geometry.coordinates": item.dataJson.geometry.coordinates,
      },
    },
    (err, result) => {
      if (err) console.error("Failed to create a new record: \n", err);
      if (result) res.send(result);
    }
  );
});

// update line
router.put("/update/configuration/line", (req, res) => {
  const item = req.body;
  console.log("lineJson", item);
  GeoConfiguration.findOneAndUpdate(
    {
      user_id: item.userId,
      "lines.properties.id": item.dataJson.properties.id,
    },
    {
      $set: {
        "lines.$.geometry.coordinates": item.dataJson.geometry.coordinates,
      },
    },
    (err, result) => {
      if (err) console.error("Failed: \n", err);
      if (result) res.send(result);
    }
  );
});

// ===================================================[DELETE]=================================================== //
// delete layer
router.put("/configuration", (req, res) => {
  const item = req.body;
  console.log("itemJson", item);
  switch (item.type) {
    case "point":
      GeoConfiguration.findOneAndUpdate(
        { user_id: item.userId },
        {
          $pull: {
            points: {
              "properties.id": item.id,
            },
          },
        },
        (err, result) => {
          if (err) console.error("Failed to create a new record: \n", err);
          else if (result) res.send(result);
        }
      );
      break;

    case "polygon":
      GeoConfiguration.findOneAndUpdate(
        { user_id: item.userId },
        {
          $pull: {
            polygons: {
              "properties.id": item.id,
            },
          },
        },
        (err, result) => {
          if (err) console.error("Failed to create a new record: \n", err);
          else if (result) res.send(result);
        }
      );
      break;

    case "line":
      GeoConfiguration.findOneAndUpdate(
        { user_id: item.userId },
        {
          $pull: {
            lines: {
              "properties.id": item.id,
            },
          },
        },
        (err, result) => {
          if (err) console.error("Failed to create a new record: \n", err);
          else if (result) res.send(result);
        }
      );
      break;
  }
});

module.exports = router;

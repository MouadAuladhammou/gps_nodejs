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

// ===================================================[GET ALL CONFIG GEOJSON]=================================================== //
// récupérer tous les éléments geoJson
router.get("/configuration/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const geoJson = await GeoConfiguration.findOne({ user_id: userId });
    if (geoJson) res.send({ geoJson });
  } catch (error) {
    return res.status(500).send({ error });
  }
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
      if (err) console.error(err);
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
      if (err) console.error(err);
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
      if (err) console.error(err);
      if (result) res.send(result);
    }
  );
});

// ===================================================[POPUP]=================================================== //
// set popup
router.put("/layer/popup", (req, res) => {
  try {
    const data = req.body;
    switch (data.type) {
      case "point":
        GeoConfiguration.findOneAndUpdate(
          { user_id: data.userId, "points.properties.id": data.id },
          { $set: { "points.$.properties.desc": data.contentText } },
          (err, result) => {
            if (err) console.error(err);
            if (result) res.send(result);
          }
        );
        break;

      case "polygon":
        GeoConfiguration.findOneAndUpdate(
          { user_id: data.userId, "polygons.properties.id": data.id },
          { $set: { "polygons.$.properties.desc": data.contentText } },
          (err, result) => {
            if (err) console.error(err);
            if (result) res.send(result);
          }
        );
        break;

      case "line":
        GeoConfiguration.findOneAndUpdate(
          { user_id: data.userId, "lines.properties.id": data.id },
          { $set: { "lines.$.properties.desc": data.contentText } },
          (err, result) => {
            if (err) console.error(err);
            if (result) res.send(result);
          }
        );
        break;
    }
  } catch (error) {
    return res.status(500).send({ error });
  }
});

// ===================================================[UPDATE]=================================================== //
// update point
router.put("/update/configuration/point", (req, res) => {
  const data = req.body;
  GeoConfiguration.findOneAndUpdate(
    {
      user_id: data.userId,
      "points.properties.id": data.dataJson.properties.id,
    },
    {
      $set: {
        "points.$.geometry.coordinates": data.dataJson.geometry.coordinates,
      },
    },
    (err, result) => {
      if (err) console.error(err);
      if (result) res.send(result);
    }
  );
});

// update polygon
router.put("/update/configuration/polygon", (req, res) => {
  const data = req.body;
  GeoConfiguration.findOneAndUpdate(
    {
      user_id: data.userId,
      "polygons.properties.id": data.dataJson.properties.id,
    },
    {
      $set: {
        "polygons.$.geometry.coordinates": data.dataJson.geometry.coordinates,
      },
    },
    (err, result) => {
      if (err) console.error(err);
      if (result) res.send(result);
    }
  );
});

// update line
router.put("/update/configuration/line", (req, res) => {
  const data = req.body;
  GeoConfiguration.findOneAndUpdate(
    {
      user_id: data.userId,
      "lines.properties.id": data.dataJson.properties.id,
    },
    {
      $set: {
        "lines.$.geometry.coordinates": data.dataJson.geometry.coordinates,
      },
    },
    (err, result) => {
      if (err) console.error(err);
      if (result) res.send(result);
    }
  );
});

// ===================================================[DELETE]=================================================== //
// delete layer
router.put("/configuration", (req, res) => {
  try {
    const data = req.body;
    switch (data.type) {
      case "point":
        GeoConfiguration.findOneAndUpdate(
          { user_id: data.userId },
          {
            $pull: {
              points: {
                "properties.id": data.id,
              },
            },
          },
          (err, result) => {
            if (err) console.error(err);
            else if (result) res.send(result);
          }
        );
        break;

      case "polygon":
        GeoConfiguration.findOneAndUpdate(
          { user_id: data.userId },
          {
            $pull: {
              polygons: {
                "properties.id": data.id,
              },
            },
          },
          (err, result) => {
            if (err) console.error(err);
            else if (result) res.send(result);
          }
        );
        break;

      case "line":
        GeoConfiguration.findOneAndUpdate(
          { user_id: data.userId },
          {
            $pull: {
              lines: {
                "properties.id": data.id,
              },
            },
          },
          (err, result) => {
            if (err) console.error(err);
            else if (result) res.send(result);
          }
        );
        break;
    }
  } catch (error) {
    return res.status(500).send({ error });
  }
});

module.exports = router;

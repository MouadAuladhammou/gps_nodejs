const express = require("express");
var router = express.Router();
var ObjectId = require("mongoose").Types.ObjectId;
var { Location } = require("../models/location");

router.get("/last_record", (req, res) => {
  Location.findOne()
    .sort({ created_at: -1 })
    .then(function (result) {
      if (result) res.send(result);
    })
    .catch((error) => {
      console.error("Error: ", error);
    });
});

router.post("/new", (req, res) => {
  Location.create({
    vehicle_id: req.body.vehicle_id,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    created_at: new Date(),
  })
    .then((result) => {
      res.send("done");
    })
    .catch((error) => {
      console.error("Failed to create a new record: ", error);
    });
});

module.exports = router;

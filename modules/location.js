const express = require("express");
var router = express.Router();
var ObjectId = require("mongoose").Types.ObjectId;
var { Location } = require("../models/location");

router.get("/last_record", (req, res) => {
  Location.findOne()
    .sort({ createdAt: -1 })
    .then(function (result) {
      if (result) res.send(result);
    })
    .catch((error) => {
      console.error("Error: ", error);
    });
});

router.post("/new", (req, res) => {
  Location.create({
    x: req.body.x,
    y: req.body.y,
    createdAt: new Date(),
  })
    .then((result) => {
      res.send("done");
    })
    .catch((error) => {
      console.error("Failed to create a new record: ", error);
    });
});

module.exports = router;

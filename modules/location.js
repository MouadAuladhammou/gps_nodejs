const express = require("express");
var router = express.Router();
const { verifyToken } = require("../middleware/check_token");
const {
  getLocations,
  getLastRecord,
} = require("../controllers/locationController.js");

router.get("/", verifyToken, getLocations);
router.get("/last-record/:imei", verifyToken, getLastRecord);

module.exports = router;

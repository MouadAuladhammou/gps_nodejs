const express = require("express");
var router = express.Router();
const {
  verifyToken,
  verifyAdminToken,
} = require("../middleware/check_token.js");

const {
  deleteVehicle,
  createAndCheckVehicle,
  updateAndCheckVehicle,
  changeGroupVehicle,
} = require("../controllers/vehicleController.js");

// User
router.route("/:id/group").put(verifyToken, changeGroupVehicle);
router.route("/").post(verifyAdminToken, createAndCheckVehicle);
router.route("/:id").delete(verifyAdminToken, deleteVehicle);

// Admin
router.route("/:id").put(verifyAdminToken, updateAndCheckVehicle);

module.exports = router;

const express = require("express");
var router = express.Router();
const { verifyToken, verifyAdminToken } = require("../middleware/check_token");

const {
  deleteVehicle,
  createAndCheckVehicle,
  updateAndCheckVehicle,
  changeGroupVehicle,
} = require("../controllers/vehicleController.js");

router.route("/").post(verifyAdminToken, createAndCheckVehicle);
router.route("/:id").delete(verifyAdminToken, deleteVehicle);
router.route("/:id").put(verifyAdminToken, updateAndCheckVehicle);
router.route("/:id/group").put(verifyToken, changeGroupVehicle);

module.exports = router;

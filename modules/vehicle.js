const express = require("express");
var router = express.Router();
const { verifyAdminToken } = require("../middleware/check_token");

const {
  deleteVehicle,
  // checkVehicleData,
  createAndCheckVehicle,
  updateAndCheckVehicle,
} = require("../controllers/vehicleController.js");

router.use(verifyAdminToken);
router.route("/").post(createAndCheckVehicle);
router.route("/:id").delete(deleteVehicle).put(updateAndCheckVehicle);
// router.route("/check-vehicle").post(checkVehicleData);

module.exports = router;

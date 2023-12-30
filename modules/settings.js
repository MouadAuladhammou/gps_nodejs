const express = require("express");
var router = express.Router();
const { verifyToken } = require("../middleware/check_token");

const {
  getSettings,
  getSetting,
  createSetting,
  updateSetting,
  deleteSetting,
  updateStatus,
} = require("../controllers/settingController.js");

router.use(verifyToken);
router.route("/").get(getSettings).post(createSetting);
router.route("/:id").get(getSetting).put(updateSetting).delete(deleteSetting);
router.route("/:id/status").put(updateStatus);

module.exports = router;

const express = require("express");
var router = express.Router();
const { verifyToken } = require("../middleware/check_token");
const {
  getLocations,
  getLastRecord,
  getNotifications,
  deleteNotification,
  updateNotificationsStatus,
} = require("../controllers/locationController.js");

router.get("/", verifyToken, getLocations);
router.get("/last-record/:imei", verifyToken, getLastRecord);
router.get("/notifications/:page", verifyToken, getNotifications);
router.put("/notification", verifyToken, deleteNotification);
router.put("/notifications", verifyToken, updateNotificationsStatus);

module.exports = router;

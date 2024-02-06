const express = require("express");
var router = express.Router();
const { verifyToken } = require("../middleware/check_token.js");
const {
  getLocations,
  getLocationsByImeis,
  getLastRecord,
  getLastRecords,
  getNotifications,
  deleteNotification,
  updateNotificationsStatus,
  getRecentDaysConsumptionAndDistance,
  getLastYearConsumptionAndDistance,
  getRecentLocations,
  getTotalDistanceTraveledToday,
} = require("../controllers/locationController.js");

router.get("/", verifyToken, getLocations);
router.get("/history", verifyToken, getLocationsByImeis);
router.get("/chart/days", verifyToken, getRecentDaysConsumptionAndDistance);
router.get("/chart/year", verifyToken, getLastYearConsumptionAndDistance);
router.get("/total-distance-today", verifyToken, getTotalDistanceTraveledToday);
router.get("/map", verifyToken, getRecentLocations);
router.get("/:imei/last-record", verifyToken, getLastRecord);
router.get("/last-recordS", verifyToken, getLastRecords);
router.get("/:page/notifications", verifyToken, getNotifications);
router.put("/notification", verifyToken, deleteNotification);
router.put("/notifications", verifyToken, updateNotificationsStatus);

module.exports = router;

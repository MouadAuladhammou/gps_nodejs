const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/check_token");

const {
  getGeoConfiguration,
  createPoint,
  createPolygon,
  createLine,
  updateContentPopup,
  updatePoint,
  updatePolygon,
  updateLine,
  deleteGeoConfiguration,
} = require("../controllers/geoController");

router.use(verifyToken);
router.route("/").get(getGeoConfiguration).put(deleteGeoConfiguration);
router.route("/point").post(createPoint).put(updatePoint);
router.route("/polygon").post(createPolygon).put(updatePolygon);
router.route("/line").post(createLine).put(updateLine);
router.route("/popup").put(updateContentPopup);

module.exports = router;

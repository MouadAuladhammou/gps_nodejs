const express = require("express");
var router = express.Router();
const { verifyToken, verifyAdminToken } = require("../middleware/check_token");
const {
  getGroupsWithVehicles,
  getGroup,
  updateGroup,
  checkGroupNameUnique,
  createGroup,
  deleteGroup,
} = require("../controllers/groupController.js");

router.route("/").get(verifyToken, getGroupsWithVehicles); // récupérer tous les éléments pour "recap" (groupes avec ses vehicles )
router.route("/:id").get(verifyToken, getGroup);
router.route("/:id").put(verifyToken, updateGroup);
router.route("/name/unique").get(verifyToken, checkGroupNameUnique);
router.route("/").post(verifyAdminToken, createGroup);
router.route("/:id").delete(verifyAdminToken, deleteGroup);

module.exports = router;

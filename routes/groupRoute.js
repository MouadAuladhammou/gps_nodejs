const express = require("express");
var router = express.Router();
const {
  verifyToken,
  verifyAdminToken,
} = require("../middleware/check_token.js");
const {
  updateGroup,
  createGroupByAdmin,
  deleteGroupByAdmin,
  createGroupByUser,
  deleteGroupByUser,
} = require("../controllers/groupController.js");

// User
router.route("/:id").put(verifyToken, updateGroup);
router.route("/u").post(verifyToken, createGroupByUser);
router.route("/u/:id").delete(verifyToken, deleteGroupByUser);

// Admin
router.route("/").post(verifyAdminToken, createGroupByAdmin);
router.route("/:id").delete(verifyAdminToken, deleteGroupByAdmin);
module.exports = router;

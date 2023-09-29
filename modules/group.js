const express = require("express");
var router = express.Router();
const { verifyToken } = require("../middleware/check_token");
const {
  getGroupsWithVehicles,
  getGroup,
  updateGroup,
  checkGroupNameUnique,
} = require("../controllers/groupController.js");

router.use(verifyToken);
router.route("/").get(getGroupsWithVehicles); // récupérer tous les éléments pour "recap" (groupes avec ses vehicles )
router.route("/:id").get(getGroup).put(updateGroup);
router.route("/name/unique").get(checkGroupNameUnique);

module.exports = router;

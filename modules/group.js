const express = require("express");
var router = express.Router();
const { verifyToken } = require("../middleware/check_token");
const { getGroupsWithVehicles } = require("../controllers/groupController.js");

// récupérer tous les éléments pour "recap" (groupes avec ses vehicles )
router.get("/", verifyToken, getGroupsWithVehicles);

module.exports = router;

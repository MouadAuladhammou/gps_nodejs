const express = require("express");
var router = express.Router();
const { verifyToken } = require("../middleware/check_token.js");

const { createTask } = require("../controllers/taskController.js");

router.use(verifyToken);
router.route("/").post(createTask);

module.exports = router;

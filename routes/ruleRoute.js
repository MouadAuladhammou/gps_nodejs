const express = require("express");
var router = express.Router();
const { verifyToken } = require("../middleware/check_token.js");

const {
  getRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
} = require("../controllers/ruleController.js");

router.use(verifyToken);
router.route("/").get(getRules).post(createRule);
router.route("/:id").get(getRule).put(updateRule).delete(deleteRule);

module.exports = router;

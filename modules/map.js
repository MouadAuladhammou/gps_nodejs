const express = require("express");
var router = express.Router();
const { verifyToken } = require("../middleware/check_token");

router.get("/show", verifyToken, (req, res) => {
  if (!res.headersSent) {
    res.status(200).send({ id: req.userId });
  }
});

module.exports = router;

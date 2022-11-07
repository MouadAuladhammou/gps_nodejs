const express = require("express");
var router = express.Router();
const jwt = require("jsonwebtoken");

router.get("/show", verifyToken, (req, res) => {
  if (!res.headersSent) {
    res.status(200).send({ id: req.userId });
  }
});

function verifyToken(req, res, next) {
  try {
    if (!req.headers.authorization) {
      return res.status(401).send({ error: "Unauthorized request 1" });
    }
    let token = req.headers.authorization.split(" ")[1];
    if (token === "null") {
      return res.status(401).send({ error: "Unauthorized request 2" });
    }
    let payload = jwt.verify(token, "_key_secret_");
    if (!payload) {
      throw new Error("Authentication failed!");
    } else {
      req.userId = payload.subject;
      next();
    }
  } catch (error) {
    return res.status(401).send({ error: "Unauthorized request 3" });
  }
}

module.exports = router;

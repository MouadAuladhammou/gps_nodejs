const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

// Angular
const verifyToken = asyncHandler((req, res, next) => {
  if (!req.headers.authorization) {
    res.status(401);
    throw new Error("User is not authorized or token is missing - 1");
  }
  let token = req.headers.authorization.split(" ")[1];
  if (token === "null") {
    res.status(401);
    throw new Error("User is not authorized or token is missing - 2");
  }
  let payload = jwt.verify(token, process.env.JWT_SECRET);
  if (!payload) {
    res.status(401);
    throw new Error("User is not authorized");
  } else {
    req.userId = payload.subject;
    next();
  }
});

// React
const verifyAdminToken = asyncHandler((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, "mySecretKey", (err, user) => {
      if (err) {
        res.status(401);
        throw new Error("User is not authorized");
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401);
    throw new Error("User is not authorized or token is missing");
  }
});

module.exports = { verifyToken, verifyAdminToken };

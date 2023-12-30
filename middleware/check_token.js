const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

// Angular with requests
const verifyToken = asyncHandler((req, res, next) => {
  try {
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
  } catch (error) {
    res.status(401);
    throw new Error("Invalid token signature");
  }
});

// Angular with sockets
const verifySocketToken = (socket, next) => {
  try {
    // console.log("socket.handshake.query", socket.handshake.query);
    if (socket.handshake.query && socket.handshake.query.token) {
      jwt.verify(
        socket.handshake.query.token,
        process.env.JWT_SECRET,
        function (err, decoded) {
          if (err) return next(new Error("Authentication error"));
          socket.decoded = decoded;
          next();
        }
      );
    } else {
      console.log("Authentication error");
      next(new Error("Authentication error"));
    }
  } catch (error) {
    console.log("error", error);
    next(new Error("Authentication error"));
  }
};

// React with requests
const verifyAdminToken = asyncHandler((req, res, next) => {
  try {
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
  } catch (error) {
    res.status(401);
    throw new Error("Invalid token signature");
  }
});

module.exports = {
  verifyToken,
  verifyAdminToken,
  verifySocketToken,
};

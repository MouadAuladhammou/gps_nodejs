const jwt = require("jsonwebtoken");

// Angular
const verifyToken = (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).send({ error: "Unauthorized request 1" });
    }
    let token = req.headers.authorization.split(" ")[1];
    if (token === "null") {
      return res.status(401).send({ error: "Unauthorized request 2" });
    }
    let payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload) {
      throw new Error("Authentication failed!");
    } else {
      req.userId = payload.subject;
      next();
    }
  } catch (error) {
    return res.status(401).send({ error: "Unauthorized request 3" });
  }
};

// React
const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, "mySecretKey", (err, user) => {
      if (err) {
        return res.status(403).json("Token is not valid!");
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json("You are not authenticated!");
  }
};

module.exports = { verifyToken, verifyAdminToken };

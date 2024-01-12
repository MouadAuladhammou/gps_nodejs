const { cleanData } = require("../utils/helpers");

// Middleware pour nettoyer et valider les données
const sanitizeData = (req, res, next) => {
  if (req.body) {
    req.body = sanitize(req.body);
  }

  if (req.query) {
    req.query = sanitize(req.query);
  }

  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

const sanitize = (data) => {
  if (typeof data === "string" || typeof data === "number") {
    return cleanData(data);
  } else if (Array.isArray(data)) {
    return data.map((item) => sanitize(item));
  } else if (typeof data === "object" && data !== null) {
    const sanitizedObject = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        sanitizedObject[key] = sanitize(data[key]);
      }
    }
    return sanitizedObject;
  } else {
    return data;
  }
};

module.exports = {
  sanitizeData,
};

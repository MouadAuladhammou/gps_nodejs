const express = require("express");
const app = express();

const bodyParser = require("body-parser");
app.use(bodyParser.json());

// Clean and sanitize request Data
const { sanitizeData } = require("./middleware/sanitize_data.js");
app.use(sanitizeData);

// Allow cross-origin
const cors = require("cors");
app.use(cors({ origin: "http://localhost:8000" })); // Accepter uniquement les requêtes provenant de gateway locale.

// Toutes les réponses de APIs seront retardées de 5 secondes grâce au middleware "express-delay"
const expressDelay = require("express-delay");
// app.use(expressDelay(5000));

// Middleware avec un délai de timeout de 60 secondes
const timeout = require("connect-timeout");
app.use(timeout("60s"));

// Routes
const location = require("./routes/locationRoute.js");
// const location_graphql = require("./routes/location_graphql.js"); // GraphQL
const user = require("./routes/userRoute.js");
const admin = require("./routes/adminRoute.js");
const geo = require("./routes/geographicRoute.js");
const group = require("./routes/groupRoute.js");
const rules = require("./routes/ruleRoute.js");
const settings = require("./routes/settingRoute.js");
const vehicle = require("./routes/vehicleRoute.js");

// routes API :
app.use("/api/locations", location);
app.use("/api/users", user);
app.use("/api/admin", admin);
app.use("/api/geo", geo);
app.use("/api/groups", group);
app.use("/api/rules", rules);
app.use("/api/settings", settings);
app.use("/api/vehicles", vehicle);

// ======================================================== [ Test API ] ======================================================== //
app.get("/heavy", (req, res) => {
  let total = 0;
  for (let i = 0; i < 5_000_000; i++) {
    total++;
  }
  res.send(`The result of the CPU intensive task is ${total}\n`);
});
// ============================================================================================================================== //

// Middleware pour gérer les erreurs et les enregistrer dans Sentry.
if (process.env.NODE_ENV !== "test") {
  const initSentry = require("./middleware/sentry");
  const Sentry = initSentry(app);
  app.use(Sentry.Handlers.requestHandler()); // Middleware pour gérer les requêtes entrantes et les enregistre dans Sentry.
  app.use(Sentry.Handlers.tracingHandler()); // Middleware pour gérer la traçabilité des transactions (tracing) dans Sentry.
  app.use(Sentry.Handlers.errorHandler());
}

// Middleware error handler
const errorHandler = require("./middleware/errorHanadler");
app.use(errorHandler);

module.exports = app;

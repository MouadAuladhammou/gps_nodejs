const mongoose = require("mongoose");

// se connecter à Mongodb
mongoose.connect(
  "mongodb://admin:adminpassword@64.226.124.200:27017/db_gps",
  (err) => {
    if (!err) console.log("MongoDB connection succeeded.");
    else
      console.log(
        "Error in DB connection : " + JSON.stringify(err, undefined, 2)
      );
  }
);
module.exports = mongoose;

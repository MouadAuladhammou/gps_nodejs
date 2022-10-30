const mongoose = require("mongoose");

// se connecter à Mongodb
mongoose.connect(
  "mongodb://localhost:27017,localhost:27020,localhost:27021/db_gps?replicaSet=r2",
  (err) => {
    if (!err) console.log("MongoDB connection succeeded.");
    else
      console.log(
        "Error in DB connection : " + JSON.stringify(err, undefined, 2)
      );
  }
);
module.exports = mongoose;

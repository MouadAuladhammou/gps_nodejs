const express = require("express");
var router = express.Router();
// var ObjectId = require("mongoose").Types.ObjectId;
var { Location } = require("../models/location");

router.get("/last_record", (req, res) => {
  Location.findOne()
    .sort({ created_at: -1 })
    .then(function (result) {
      if (result) res.send(result);
    })
    .catch((error) => {
      console.error("Error: ", error);
    });
});

router.post("/new", (req, res) => {
  Location.create({
    vehicle_id: req.body.vehicle_id,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    created_at: new Date(),
  })
    .then((result) => {
      res.send("done");
    })
    .catch((error) => {
      console.error("Failed to create a new record: ", error);
    });
});

// pagination
router.get("/", (req, res) => {
  let { page = 1, limit = 10, start_date, end_date, range, hour } = req?.query;

  let [dateComponents, timeComponents] = start_date.split(" ");
  let [day, month, year] = dateComponents.split("/");
  let [hours, minutes, seconds] = timeComponents.split(":");
  start_date = new Date(+year, month - 1, +day, +hours, +minutes, +seconds);

  [dateComponents, timeComponents] = end_date.split(" ");
  [day, month, year] = dateComponents.split("/");
  [hours, minutes, seconds] = timeComponents.split(":");
  end_date = new Date(+year, month - 1, +day, +hours, +minutes, +seconds);

  // Vérifier la date si elle n'existe pas (si la date n'existe pas, retourner les données du mois dernier)
  if (!start_date)
    start_date = new Date(
      new Date().getFullYear(),
      new Date().getMonth() - 1,
      1
    );
  if (!end_date) end_date = new Date();

  // adjust limit
  if (range && range > 1) {
    limit = limit * parseInt(range);
  }

  // récupération de données
  if (hour) {
    Location.find({
      created_at: {
        $gte: new Date(decodeURI(start_date)),
        $lt: new Date(decodeURI(end_date)), // .getTime() + 1 * 24 * 60 * 60000,
      },
    })
      .where({ hour: hour })
      .sort({ created_at: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .then(async (result) => {
        if (result) {
          // obtenir le nombre de pages
          let count = await Location.find({
            created_at: {
              $gte: new Date(decodeURI(start_date)),
              $lt: new Date(decodeURI(end_date)), // .getTime() + 1 * 24 * 60 * 60000,
            },
          })
            .where({ hour: hour })
            .countDocuments();

          // ajustez le nombre de pages s'il y a une plage spécifique (il s'agit de Input de type "range")
          if (range && range > 1) {
            count = count / parseInt(range);
          }

          // réduire les données retournées sur une plage donnée (il s'agit de Input de type "range")
          if (range && parseInt(range) > 1) {
            let _result = [];
            let i = 1;
            [...result].forEach((el) => {
              if (i === parseInt(range)) {
                _result.push(el);
                i = 1;
              } else {
                i++;
              }
            });

            res.send({ count, result: _result });
          } else {
            res.send({ count, result });
          }
        }
      })
      .catch((error) => {
        console.error("Error: ", error);
      });
  } else {
    Location.find({
      created_at: {
        $gte: new Date(decodeURI(start_date)),
        $lt: new Date(decodeURI(end_date)), // .getTime() + 1 * 24 * 60 * 60000,
      },
    })
      .sort({ created_at: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .then(async (result) => {
        if (result) {
          // obtenir le nombre de pages
          let count = await Location.find({
            created_at: {
              $gte: new Date(decodeURI(start_date)),
              $lt: new Date(decodeURI(end_date)), // .getTime() + 1 * 24 * 60 * 60000,
            },
          }).countDocuments();

          // ajustez le nombre de pages s'il y a une plage spécifique (il s'agit de Input de type "range")
          if (range && range > 1) {
            count = count / parseInt(range);
          }

          // réduire les données retournées sur une plage donnée (il s'agit de Input de type "range")
          if (range && parseInt(range) > 1) {
            let _result = [];
            let i = 1;
            [...result].forEach((el) => {
              if (i === parseInt(range)) {
                _result.push(el);
                i = 1;
              } else {
                i++;
              }
            });

            res.send({ count, result: _result });
          } else {
            res.send({ count, result });
          }
        }
      })
      .catch((error) => {
        console.error("Error: ", error);
      });
  }
});

module.exports = router;

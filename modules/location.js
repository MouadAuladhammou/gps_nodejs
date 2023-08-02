const express = require("express");
var router = express.Router();
const { verifyToken } = require("../middleware/check_token");
// var ObjectId = require("mongoose").Types.ObjectId;
const { createLocationModel } = require("../models/location.js");

const {
  isValidDateTime,
  parseDateTime,
  getOrSetCache,
} = require("../utils/functions");

/* 
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
      console.error(error);
    });
}); 
*/

router.get("/last-record/:imei", verifyToken, (req, res) => {
  const imei = req.params.imei;
  const Location = createLocationModel(req.userId);
  Location.findOne()
    .where({ imei })
    .sort({ created_at: -1 })
    .then(function (result) {
      if (result) res.send(result);
    })
    .catch((error) => {
      console.error("Error: ", error);
    });
});

// pagination
router.get("/", verifyToken, async (req, res) => {
  let {
    imei,
    page = 1,
    limit = 10,
    start_date,
    end_date,
    range,
    hour,
  } = req.query;

  const dataHistory = await getOrSetCache(
    `dataHistory?imei=${imei}&page=${page}&limit=${limit}&start_date=${start_date}&end_date=${end_date}&range=${range}&hour=${hour}`,
    async () => {
      const Location = createLocationModel(req.userId);
      let startDate, endDate;
      if (start_date && isValidDateTime(start_date)) {
        startDate = parseDateTime(start_date);
      } else {
        startDate = new Date(
          new Date().getFullYear(),
          new Date().getMonth() - 1,
          1
        );
      }
      if (end_date && isValidDateTime(end_date)) {
        endDate = parseDateTime(end_date);
      } else {
        endDate = new Date();
      }

      // ajuster limit avec range
      if (range && range > 1) {
        limit = limit * parseInt(range);
      }

      try {
        const query = {
          timestamp: { $gte: startDate, $lt: endDate },
          imei: imei,
          ...(hour && { hour: hour }),
        };

        let count = await Location.countDocuments(query);

        let resultQuery = Location.find(query)
          .sort({ timestamp: 1 })
          .skip((page - 1) * limit)
          .limit(limit);

        let result = await resultQuery.exec();

        // ajuster le nombre de pages s'il y a une plage spécifique (il s'agit de Input de type "range")
        if (range && range > 1) {
          count = count / parseInt(range);
        }

        // réduire les données retournées sur une plage donnée (il s'agit de Input de type "range")
        if (range && parseInt(range) > 1) {
          let _result = [];
          let i = 1;
          result.forEach((el) => {
            if (i === parseInt(range)) {
              _result.push(el);
              i = 1;
            } else {
              i++;
            }
          });

          return { count, result: _result };
        } else {
          return { count, result };
        }
      } catch (error) {
        console.error("Error: ", error);
        res.status(500).send("Internal Server Error");
      }
    }
  );
  res.send({ ...dataHistory });
});

module.exports = router;

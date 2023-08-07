const asyncHandler = require("express-async-handler");
const { createLocationModel } = require("../models/location.js");
const {
  isValidDateTime,
  parseDateTime,
  getOrSetCache,
} = require("../utils/functions");

const getLocations = asyncHandler(async (req, res) => {
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
    }
  );
  res.status(200).send({ ...dataHistory });
});

const getLastRecord = asyncHandler(async (req, res) => {
  const imei = req.params.imei;
  const Location = createLocationModel(req.userId);
  const location = await Location.findOne()
    .where({ imei })
    .sort({ created_at: -1 });

  if (location) {
    res.status(200).send(location);
  } else {
    res.status(404);
    throw new Error("Location not found");
  }
});

module.exports = {
  getLocations,
  getLastRecord,
};

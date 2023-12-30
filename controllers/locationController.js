const asyncHandler = require("express-async-handler");
const { createLocationModel } = require("../models/location.js");
const { Types } = require("mongoose");
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
    notifications_only,
  } = req.query;

  const dataHistory = await getOrSetCache(
    `dataHistory?imei:${imei}
    &page=${page}
    &limit=${limit}
    &start_date=${encodeURIComponent(start_date)}
    &end_date=${encodeURIComponent(end_date)}
    &range=${range}
    &hour=${hour}
    &notifications_only=${notifications_only}`,
    60,
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

      startDate.setMilliseconds(0);
      endDate.setMilliseconds(999);

      // ajuster limit avec range
      if (range && range > 1) {
        limit = limit * parseInt(range);
      }

      const query = {
        timestamp: { $gte: startDate, $lt: endDate },
        imei: imei,
        ...(hour && { hour: hour }),
        // notifications.0: si le premier élément du tableau notifications existe, ce qui signifie qu'il y a au moins une notification
        ...(notifications_only === "true" && {
          "notifications.0": { $exists: true },
        }),
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

const getLocationsByImeis = asyncHandler(async (req, res) => {
  let { imeis, page = 1, limit = 10, start_date, end_date } = req.query;

  const dataHistory = await getOrSetCache(
    `dataHistory?imeis:${imeis}
      &page=${page}
      &limit=${limit}
      &start_date=${encodeURIComponent(start_date)}
      &end_date=${encodeURIComponent(end_date)}`,
    1800000, // 30 min
    async () => {
      try {
        const Location = createLocationModel(req.userId);
        if (isValidDateTime(start_date)) {
          let startDate, endDate;
          startDate = parseDateTime(start_date);
          if (!isValidDateTime(end_date)) {
            endDate = parseDateTime(start_date);
          } else {
            endDate = parseDateTime(end_date);
          }
          endDate.setHours(23, 59, 59, 999);

          const imeisArray =
            imeis.split(",").map((imei) => parseInt(imei)) || [];

          const matchConditions = {
            timestamp: { $gte: startDate, $lt: endDate },
            imei: { $in: imeisArray },
          };

          limit = parseInt(limit);
          const skip = (page - 1) * limit;
          const result = await Location.aggregate([
            {
              $match: matchConditions,
            },
            {
              $sort: { timestamp: 1 }, // Tri par timestamp ascendant
            },
            {
              $addFields: {
                day: {
                  $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
                },
                speedGreaterThanZero: { $gt: ["$gps.speed", 5] }, // Ajout d'un champ pour vérifier si speed > 5
              },
            },
            {
              $group: {
                _id: {
                  imei: "$imei",
                  day: "$day",
                },
                totalMovement: { $sum: "$ioElements.Movement" },
                firstOdometer: { $first: "$ioElements.Total Odometer" },
                lastOdometer: { $last: "$ioElements.Total Odometer" },
                count: { $sum: 1 },
                totalNotifications: { $sum: { $size: "$notifications" } },
                averageSpeed: {
                  $avg: {
                    $cond: {
                      if: "$speedGreaterThanZero",
                      then: "$gps.speed",
                      else: null,
                    },
                  },
                },
              },
            },
            {
              $sort: { "_id.day": 1 },
            },
            {
              $group: {
                _id: "$_id.imei",
                days: {
                  $push: {
                    day: "$_id.day",
                    totalMovement: "$totalMovement",
                    totalOdometerDiff: {
                      $subtract: ["$lastOdometer", "$firstOdometer"],
                    },
                    count: "$count",
                    totalNotifications: "$totalNotifications",
                    averageSpeed: "$averageSpeed",
                  },
                },
              },
            },
            {
              $sort: { _id: 1 },
            },
            {
              $project: {
                _id: 0,
                imei: "$_id",
                days: 1,
              },
            },
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ]);

          const count = result.length;
          return { count, result };
        } else {
          return { count: 0, result: [] };
        }
      } catch (e) {
        console.error("Error:", e);
        throw e; // Rethrow the error to be caught by the outer error handler
      }
    }
  );

  res.status(200).send({ ...dataHistory });
});

const getRecentDaysConsumptionAndDistance = asyncHandler(async (req, res) => {
  const endDate = new Date(); // Date actuelle
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 7); // 7 jours avant la date actuelle
  const data = await getOrSetCache(
    `getRecentDaysConsumptionAndDistance:${req.userId}`,
    1800000, // 30 min,
    async () => {
      try {
        const Location = createLocationModel(req.userId);
        const result = await Location.aggregate([
          {
            $match: {
              timestamp: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $sort: { timestamp: 1 },
          },
          {
            $group: {
              _id: {
                imei: "$imei",
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
                },
              },
              firstOdometer: { $first: "$ioElements.Total Odometer" },
              lastOdometer: { $last: "$ioElements.Total Odometer" },
            },
          },
          {
            $project: {
              _id: 0,
              imei: "$_id.imei",
              date: "$_id.date",
              odometerDiff: {
                $subtract: ["$lastOdometer", "$firstOdometer"],
              },
            },
          },
          {
            $group: {
              _id: "$date",
              totalOdometerDiff: { $sum: "$odometerDiff" },
            },
          },
          {
            $sort: { _id: 1 }, // Tri par jour ascendant
          },
        ]);

        if (result.length > 0) {
          const count = result.length;
          return { count, result };
        } else {
          return { count: 0, result: [] };
        }
      } catch (e) {
        console.error("Error:", e);
        throw e; // Rethrow the error to be caught by the outer error handler
      }
    }
  );
  res.status(200).send({ ...data });
});

const getLastYearConsumptionAndDistance = asyncHandler(async (req, res) => {
  const currentDate = new Date();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(currentDate.getMonth() - 12);
  const data = await getOrSetCache(
    `getLastYearConsumptionAndDistance:${req.userId}`,
    1800000, // 30 min,
    async () => {
      try {
        const Location = createLocationModel(req.userId);
        const result = await Location.aggregate([
          {
            $match: {
              timestamp: { $gte: twelveMonthsAgo, $lte: currentDate },
            },
          },
          {
            $sort: { timestamp: 1 },
          },
          {
            $group: {
              _id: {
                imei: "$imei",
                year: { $year: "$timestamp" },
                month: { $month: "$timestamp" },
                day: { $dayOfMonth: "$timestamp" },
              },
              firstOdometer: { $first: "$ioElements.Total Odometer" },
              lastOdometer: { $last: "$ioElements.Total Odometer" },
            },
          },
          {
            $project: {
              _id: 1,
              odometerDiff: {
                $subtract: ["$lastOdometer", "$firstOdometer"],
              },
            },
          },
          {
            $group: {
              _id: {
                year: "$_id.year",
                month: "$_id.month",
              },
              totalOdometerDiff: { $sum: "$odometerDiff" },
            },
          },
          {
            $sort: { "_id.imei": 1, "_id.year": 1, "_id.month": 1 },
          },
        ]);

        if (result.length > 0) {
          const count = result.length;
          return { count, result };
        } else {
          return { count: 0, result: [] };
        }
      } catch (e) {
        console.error("Error:", e);
        throw e; // Rethrow the error to be caught by the outer error handler
      }
    }
  );
  res.status(200).send({ ...data });
});

const getLastRecord = asyncHandler(async (req, res) => {
  const imei = req.params.imei;
  const Location = createLocationModel(req.userId);
  const location = await Location.findOne()
    .where({ imei })
    .sort({ created_at: -1 });
  res.status(200).send(location);
});

const getNotifications = asyncHandler(async (req, res) => {
  const perPage = 4; // Nombre d'éléments à charger à chaque fois
  const currentPage = req.params.page || 1;
  const startIndex = (currentPage - 1) * perPage;

  const Location = createLocationModel(req.userId);
  const notifications = await Location.aggregate([
    { $unwind: "$notifications" }, // Décompose le tableau notifications
    // Rappel: Les notifications sont même des notifications qui sont dans le document du collection mais doivent également avoir le champ "viewedOnNavBar" pour être considérées comme une notification affichée sur une NavBar
    { $match: { "notifications.viewedOnNavBar": { $exists: true } } }, // Filtrer les notifications avec viewedOnNavBar
    { $sort: { timestamp: -1, "notifications.type": 1 } }, // Tri par timestamp puis par type
    { $skip: startIndex },
    { $limit: perPage },
    { $project: { _id: 1, imei: 1, notifications: 1, timestamp: 1 } }, // Projeter les notifications et les champs nécessaires
  ]);

  res.status(200).send(notifications || []);
});

const deleteNotification = asyncHandler(async (req, res) => {
  const Location = createLocationModel(req.userId);
  const { notificationType, documentId } = req.body;
  if (!notificationType || !documentId) {
    res.status(404);
    throw new Error("Notification not found");
  } else {
    try {
      const updated = await Location.findOneAndUpdate(
        { _id: documentId, "notifications.type": parseInt(notificationType) },
        {
          // Supprimer simplement le champ "viewedOnNavBar" pour qu'il ne soit plus affiché dans la Navbar tout en conservant ses données pour un suivi historique
          $unset: {
            "notifications.$.viewedOnNavBar": "",
          },
        }
      );
      updated ? res.status(204).end() : res.status(404).end();
    } catch (err) {
      res.status(500);
      throw new Error("Internal Server Error: " + err.message);
    }
  }
});

// Mettre à jour les statuts de notifications en changeant la variable "viewedOnNavBar" en "true"
const updateNotificationsStatus = asyncHandler(async (req, res) => {
  const Location = createLocationModel(req.userId);
  const { listNotif: notificationIdsToUpdate } = req.body;

  if (notificationIdsToUpdate.length < 1) {
    res.status(404);
    throw new Error("Notification not found");
  } else {
    try {
      const promises = notificationIdsToUpdate.map(async ({ _id, type }) => {
        const updated = await Location.updateOne(
          {
            _id: Types.ObjectId(_id),
            "notifications.type": type,
            "notifications.viewedOnNavBar": false,
          },
          { $set: { "notifications.$.viewedOnNavBar": true } }
        );
        return updated;
      });

      const modifiedCounts = await Promise.all(promises);

      // Vérifiez si au moins une mise à jour a été effectuée
      const success = modifiedCounts.some(
        ({ modifiedCount }) => modifiedCount > 0
      );

      success ? res.status(204).end() : res.status(404).end();
    } catch (err) {
      res.status(500);
      throw new Error("Internal Server Error: " + err.message);
    }
  }
});

module.exports = {
  getLocations,
  getLastRecord,
  getNotifications,
  getLocationsByImeis,
  deleteNotification,
  updateNotificationsStatus,
  getRecentDaysConsumptionAndDistance,
  getLastYearConsumptionAndDistance,
};

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
    `dataHistory?imei:${imei}&page=${page}&limit=${limit}&start_date=${encodeURIComponent(
      start_date
    )}&end_date=${encodeURIComponent(
      end_date
    )}&range=${range}&hour=${hour}&notifications_only=${notifications_only}`,
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
      updated ? res.status(200).end() : res.status(404).end();
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

      success ? res.status(200).end() : res.status(404).end();
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
  deleteNotification,
  updateNotificationsStatus,
};

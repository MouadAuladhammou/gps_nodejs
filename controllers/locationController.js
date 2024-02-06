const asyncHandler = require("express-async-handler");
const LocationService = require("../services/locationService");

const getLocations = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const {
      imei,
      page = 1,
      limit = 10,
      start_date,
      end_date,
      range,
      hour,
      notifications_only,
    } = req.query;

    const dataHistory = await LocationService.getLocations(
      userId,
      imei,
      page,
      limit,
      start_date,
      end_date,
      range,
      hour,
      notifications_only
    );

    res.status(200).send({ ...dataHistory });
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const getLocationsByImeis = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const { imeis, page = 1, limit = 10, start_date, end_date } = req.query;

    const dataHistory = await LocationService.getLocationsByImeis(
      userId,
      imeis,
      page,
      limit,
      start_date,
      end_date
    );

    res.status(200).send({ ...dataHistory });
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const getRecentDaysConsumptionAndDistance = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const data = await LocationService.getRecentDaysConsumptionAndDistance(
      userId
    );
    res.status(200).send({ ...data });
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const getLastYearConsumptionAndDistance = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const data = await LocationService.getLastYearConsumptionAndDistance(
      userId
    );
    res.status(200).send({ ...data });
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const getRecentLocations = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const recentLocations = await LocationService.getRecentLocations(userId);
    res.status(200).send(recentLocations);
  } catch (err) {
    throw new Error("Internal Server Error: " + err.message);
  }
});

const getTotalDistanceTraveledToday = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const data = await LocationService.getTotalDistanceTraveledToday(userId);
    res.status(200).send({ ...data });
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const getLastRecord = asyncHandler(async (req, res) => {
  try {
    const imei = req.params.imei;
    const userId = req.userId;
    const location = await LocationService.getLastRecord(imei, userId);
    res.status(200).send(location);
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const getLastRecords = asyncHandler(async (req, res) => {
  try {
    const query = req.query;
    if (
      query.imeis !== undefined &&
      query.imeis !== null &&
      query.imeis.trim() !== ""
    ) {
      const imeis = query.imeis.split(",");
      const userId = req.userId;
      const latestLocations = await LocationService.getLastRecords(
        imeis,
        userId
      );
      res.status(200).send(latestLocations);
    } else {
      res.status(400).send('Paramètre "imeis" manquant ou vide.');
    }
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const getNotifications = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const page = req.params.page;
    const notifications = await LocationService.getNotifications(userId, page);
    res.status(200).send(notifications);
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const deleteNotification = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId; // Assurez-vous d'avoir req.userId correctement défini dans votre middleware d'authentification
    const { notificationType, documentId } = req.body;
    const updated = await LocationService.deleteNotification(
      userId,
      notificationType,
      documentId
    );
    updated ? res.status(204).end() : res.status(404).end();
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

const updateNotificationsStatus = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const { listNotif: notificationIdsToUpdate } = req.body;
    const success = await LocationService.updateNotificationsStatus(
      userId,
      notificationIdsToUpdate
    );

    success ? res.status(204).end() : res.status(404).end();
  } catch (err) {
    res.status(500);
    throw new Error("Internal Server Error: " + err.message);
  }
});

module.exports = {
  getLocations,
  getLastRecord,
  getLastRecords,
  getNotifications,
  getLocationsByImeis,
  deleteNotification,
  updateNotificationsStatus,
  getRecentDaysConsumptionAndDistance,
  getLastYearConsumptionAndDistance,
  getRecentLocations,
  getTotalDistanceTraveledToday,
};

const { sequelize } = require("../config/mysql.js");
const { Group, Vehicle, Task } = require("../models/index.js");

class TaskService {
  async create(task, userId) {
    // initialize data
    const dateTimeStartFrom = new Date(
      task.date_start.year,
      task.date_start.month - 1,
      task.date_start.day,
      task.time_start_from.hour,
      task.time_start_from.minute,
      task.time_start_from.second
    ).toISOString();

    const dateTimeStartTo = new Date(
      task.date_start.year,
      task.date_start.month - 1,
      task.date_start.day,
      task.time_start_to.hour,
      task.time_start_to.minute,
      task.time_start_to.second
    ).toISOString();

    let dateTimeEndFrom,
      dateTimeEndTo,
      polygonDestinationId,
      polygonDestinationDesc,
      polygonDestinationCoordinates;

    if (!task.polygon_start_only) {
      dateTimeEndFrom = new Date(
        task.date_end.year,
        task.date_end.month - 1,
        task.date_end.day,
        task.time_end_from.hour,
        task.time_end_from.minute,
        task.time_end_from.second
      ).toISOString();
      dateTimeEndTo = new Date(
        task.date_end.year,
        task.date_end.month - 1,
        task.date_end.day,
        task.time_end_to.hour,
        task.time_end_to.minute,
        task.time_end_to.second
      ).toISOString();
      polygonDestinationId = task.polygon_destination.id;
      polygonDestinationDesc = task.polygon_destination.text;
      polygonDestinationCoordinates = JSON.stringify(
        task.polygon_destination.coordinates
      );
    } else {
      dateTimeEndFrom = null;
      dateTimeEndTo = null;
      polygonDestinationId = null;
      polygonDestinationDesc = null;
      polygonDestinationCoordinates = null;
    }

    if (
      !task.polygon_start_only &&
      (dateTimeStartFrom > dateTimeStartTo ||
        dateTimeStartFrom > dateTimeEndFrom ||
        dateTimeStartFrom > dateTimeEndTo ||
        dateTimeStartTo > dateTimeEndFrom ||
        dateTimeStartTo > dateTimeEndTo ||
        dateTimeEndFrom > dateTimeEndTo)
    ) {
      throw new Error("Invalid dates");
    }

    // Create tasks
    let transaction;
    try {
      transaction = await sequelize.transaction();
      for (const vehicle of task.vehicles) {
        await Task.create(
          {
            name: task.name,
            user_id: userId,
            vehicle_id: vehicle.id,
            description: task.description,
            status: task.status,
            polygon_start_only: task.polygon_start_only,

            polygon_start: task.polygon_start.id,
            polygon_start_desc: task.polygon_start.text,
            polygon_start_coordinates: JSON.stringify(
              task.polygon_start.coordinates
            ),

            polygon_destination: polygonDestinationId,
            polygon_destination_desc: polygonDestinationDesc,
            polygon_destination_coordinates: polygonDestinationCoordinates,

            date_time_start_From: dateTimeStartFrom,
            date_time_start_to: dateTimeStartTo,
            date_time_end_From: dateTimeEndFrom,
            date_time_end_to: dateTimeEndTo,
          },
          { transaction }
        );
      }
      await transaction.commit();
    } catch (err) {
      if (transaction) await transaction.rollback();
      throw new Error("Error while creating tasks: " + err.message);
    }
  }
}

module.exports = new TaskService();

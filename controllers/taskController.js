const asyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
const { Vehicle, Task } = require("../models/index.js");
const TaskService = require("../services/taskService");
// const { getCurrentUser } = require("../services/userService");

const createTask = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const task = req.body;
    await TaskService.create(task, userId);
    res.status(204).end();
  } catch (error) {
    res.status(500);
    throw new Error("Internal Server Error: " + error.message);
  }
});

module.exports = {
  createTask,
};

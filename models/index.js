const { Setting } = require("./setting.js");
const { Group } = require("./group.js");
const { Vehicle } = require("./vehicle.js");
const { Task } = require("./task.js");
const { TaskHistory } = require("./task_history.js");
const { User } = require("./user.js");
const { GeoParameter } = require("./geographic.js");
const { Admin } = require("./admin.js");
const { Rule } = require("./rule.js");
const { SettingRule } = require("./setting_rule.js");

// Set relationship
User.hasMany(Group, {
  foreignKey: "user_id",
  as: "groupes",
});

Group.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

Setting.hasMany(Group, {
  foreignKey: "setting_id",
  as: "groupes",
});

Group.hasMany(Vehicle, {
  foreignKey: "groupe_id",
  as: "vehicles",
});

Vehicle.hasMany(Task, {
  foreignKey: "vehicle_id",
  as: "tasks",
});

Task.belongsTo(Vehicle, {
  foreignKey: "vehicle_id",
  as: "vehicle",
});

Task.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

User.hasMany(Task, {
  foreignKey: "user_id",
  as: "tasks",
});

Vehicle.hasMany(TaskHistory, {
  foreignKey: "vehicle_id",
  as: "tasks_histories",
});

TaskHistory.belongsTo(Vehicle, {
  foreignKey: "vehicle_id",
  as: "vehicle",
});

User.hasMany(TaskHistory, {
  foreignKey: "user_id",
  as: "tasks_histories",
});

Group.belongsTo(Setting, {
  foreignKey: "setting_id",
  as: "setting",
});

Vehicle.belongsTo(Group, {
  foreignKey: "groupe_id",
  as: "group",
});

User.hasOne(GeoParameter, {
  foreignKey: "user_id",
  as: "geo_parameter",
});

Setting.belongsToMany(Rule, {
  through: { model: SettingRule, unique: false },
  as: "rules",
  foreignKey: "setting_id",
});

Rule.belongsToMany(Setting, {
  through: { model: SettingRule, unique: false },
  as: "settings",
  foreignKey: "rule_id",
});

module.exports = {
  Setting,
  Group,
  Vehicle,
  Task,
  TaskHistory,
  User,
  GeoParameter,
  Admin,
  Rule,
};

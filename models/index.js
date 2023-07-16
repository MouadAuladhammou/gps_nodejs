const { Setting } = require("./setting.js");
const { Group } = require("./group.js");
const { Vehicle } = require("./vehicle.js");
const { User } = require("./user.js");
const { GeoParameter } = require("./geographic.js");
const { Admin } = require("./admin.js");
const { Rule } = require("./rule.js");
const { SettingRule } = require("./setting_rule.js");

// Set relationship
Setting.hasMany(Group, {
  foreignKey: "setting_id",
  as: "groupes",
});

Group.hasMany(Vehicle, {
  foreignKey: "groupe_id",
  as: "vehicles",
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

User.hasMany(Group, {
  foreignKey: "user_id",
  as: "groupes",
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

module.exports = { Setting, Group, Vehicle, User, GeoParameter, Admin, Rule };

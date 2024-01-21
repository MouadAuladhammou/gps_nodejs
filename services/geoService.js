const { GeoConfiguration } = require("../models/geographic");

class GeoService {
  async getGeoConfiguration(userId) {
    try {
      return await GeoConfiguration.findOne({ user_id: userId });
    } catch (err) {
      throw new Error("Error while fetching geo configuration: " + err.message);
    }
  }

  async createPoint(userId, pointJson) {
    try {
      return await GeoConfiguration.findOneAndUpdate(
        { user_id: userId },
        {
          $push: {
            points: pointJson,
          },
        }
      );
    } catch (err) {
      throw new Error("Error while creating point: " + err.message);
    }
  }

  async createPolygon(userId, polygonJson) {
    try {
      return await GeoConfiguration.findOneAndUpdate(
        { user_id: userId },
        {
          $push: {
            polygons: polygonJson,
          },
        }
      );
    } catch (err) {
      throw new Error("Error while creating polygon: " + err.message);
    }
  }

  async createLine(userId, lineJson) {
    try {
      return await GeoConfiguration.findOneAndUpdate(
        { user_id: userId },
        {
          $push: {
            lines: lineJson,
          },
        }
      );
    } catch (err) {
      throw new Error("Error while creating line: " + err.message);
    }
  }

  async updateContentPopup(userId, data) {
    try {
      let config = null;

      switch (data.type) {
        case "point":
          config = await GeoConfiguration.findOneAndUpdate(
            { user_id: userId, "points.properties.id": data.id },
            { $set: { "points.$.properties.desc": data.contentText } }
          );
          break;

        case "polygon":
          config = await GeoConfiguration.findOneAndUpdate(
            { user_id: userId, "polygons.properties.id": data.id },
            { $set: { "polygons.$.properties.desc": data.contentText } }
          );
          break;

        case "line":
          config = await GeoConfiguration.findOneAndUpdate(
            { user_id: userId, "lines.properties.id": data.id },
            { $set: { "lines.$.properties.desc": data.contentText } }
          );
          break;

        default:
          throw new Error("Invalid type");
      }

      return config;
    } catch (err) {
      throw new Error("Error while updating content popup: " + err.message);
    }
  }

  async updatePoint(userId, dataJson) {
    try {
      const config = await GeoConfiguration.findOneAndUpdate(
        {
          user_id: userId,
          "points.properties.id": dataJson.properties.id,
        },
        {
          $set: {
            "points.$.geometry.coordinates": dataJson.geometry.coordinates,
          },
        }
      );

      return config;
    } catch (err) {
      throw new Error("Error while updating point: " + err.message);
    }
  }

  async updatePolygon(userId, dataJson) {
    try {
      const config = await GeoConfiguration.findOneAndUpdate(
        {
          user_id: userId,
          "polygons.properties.id": dataJson.properties.id,
        },
        {
          $set: {
            "polygons.$.geometry.coordinates": dataJson.geometry.coordinates,
          },
        }
      );
      return config;
    } catch (err) {
      throw new Error("Error while updating polygon: " + err.message);
    }
  }

  async updateLine(userId, dataJson) {
    try {
      const config = await GeoConfiguration.findOneAndUpdate(
        {
          user_id: userId,
          "lines.properties.id": dataJson.properties.id,
        },
        {
          $set: {
            "lines.$.geometry.coordinates": dataJson.geometry.coordinates,
          },
        }
      );
      return config;
    } catch (err) {
      throw new Error("Error while updating line: " + err.message);
    }
  }

  async deleteGeoConfiguration(userId, type, id) {
    try {
      let result;

      switch (type) {
        case "point":
          result = await GeoConfiguration.findOneAndUpdate(
            { user_id: userId },
            {
              $pull: {
                points: {
                  "properties.id": id,
                },
              },
            }
          );
          break;

        case "polygon":
          result = await GeoConfiguration.findOneAndUpdate(
            { user_id: userId },
            {
              $pull: {
                polygons: {
                  "properties.id": id,
                },
              },
            }
          );
          break;

        case "line":
          result = await GeoConfiguration.findOneAndUpdate(
            { user_id: userId },
            {
              $pull: {
                lines: {
                  "properties.id": id,
                },
              },
            }
          );
          break;

        default:
          throw new Error("Invalid type");
      }

      return result;
    } catch (err) {
      throw new Error("Error while deleting GeoConfiguration: " + err.message);
    }
  }
}

module.exports = new GeoService();

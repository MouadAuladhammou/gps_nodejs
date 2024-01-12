const xss = require("xss");

// Convertir un tableau de modèles Sequelize en JSON
const convertToJson = (data) => data.map((item) => item.toJSON());

// Convertir une Map en un objet JavaScript
const convertMapToObject = (data) => Object.fromEntries(data);

// Comparer un objet précédent avec l'objet IMEI actuel de Socket GPS
const hasSameImeiAndTimestamp = (obj1, obj2) => {
  const { imei: imei1, timestamp: timestamp1 } = obj1 || {};
  const { imei: imei2, timestamp: timestamp2 } = obj2 || {};
  return imei1 === imei2 && timestamp1 === timestamp2;
};

const getHourlyDateWithoutMinutes = (timestamp) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  return `${year}_${month}_${day}__${hour}`;
};

// nettoyer les données entrantes (body et query) pour chaque requête
const cleanData = (data, maxLength = 255) => {
  try {
    if (data == null) {
      return null;
    }

    if (typeof data === "string" && data.trim() === "") {
      return "";
    }

    if (typeof data === "string") {
      data = data.trim();
    }

    if (typeof data === "string" && data.length > maxLength) {
      data = data.substring(0, maxLength);
    }

    // Nettoyer les données potentiellement dangereuses contre XSS
    data = xss(data);

    return data;
  } catch (e) {
    return null;
  }
};

module.exports = {
  convertToJson,
  convertMapToObject,
  hasSameImeiAndTimestamp,
  getHourlyDateWithoutMinutes,
  cleanData,
};

const xss = require("xss");

// Convertir un tableau de modèles Sequelize en JSON
const convertToJson = (data) => data.map((item) => item.toJSON());

// Convertir une Map en un objet JavaScript
const convertMapToObject = (data) => Object.fromEntries(data);

// Comparer un objet précédent avec l'objet IMEI actuel de Socket GPS
const hasSameImeiAndTimestamp = (obj1, obj2) => {
  const { imei: imei1, timestamp: timestamp1 } = obj1 || {};
  const { imei: imei2, timestamp: timestamp2 } = obj2 || {};

  // convertir une date ISO en objet Date sans les millisecondes
  const removeMilliseconds = (dateString) => {
    const date = new Date(dateString);
    date.setMilliseconds(0);
    return date;
  };

  // Comparaison des IMEI
  const sameImei = imei1 === imei2;

  // Comparaison des timestamps (en éliminant les millisecondes)
  const sameTimestamp =
    removeMilliseconds(timestamp1).getTime() ===
    removeMilliseconds(timestamp2).getTime();

  return sameImei && sameTimestamp;
};

const getHourlyDateWithoutMinutes = (timestamp) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  return `${year}_${month}_${day}__${hour}`;
};

const isWithin5Minutes = (timestamp) => {
  // Convertir le timestamp en objet Date
  const timestampDate = new Date(timestamp);

  // Calculer la différence entre le timestamp et l'heure actuelle
  const currentTime = new Date();
  const differenceInMillis = Math.abs(currentTime - timestampDate);

  // Vérifier si la différence est inférieure ou égale à 5 minutes (300000 millisecondes)
  return differenceInMillis <= 5 * 60 * 1000;
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

function formatFrenchDate(timestamp) {
  const date = new Date(timestamp);

  const months = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  // Obtenir le mois, le jour et l'année
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  // Obtenir l'heure et les minutes
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Formater la date
  const formattedDate = `${month} ${day}-${year}, ${hours}h${minutes}min`;
  return formattedDate;
}

function isDateToday(timestamp) {
  const dateToCheck = new Date(timestamp);
  const currentDate = new Date();

  // Comparer l'année, le mois et le jour
  const isToday =
    dateToCheck.getFullYear() === currentDate.getFullYear() &&
    dateToCheck.getMonth() === currentDate.getMonth() &&
    dateToCheck.getDate() === currentDate.getDate();

  return isToday;
}

module.exports = {
  convertToJson,
  convertMapToObject,
  hasSameImeiAndTimestamp,
  getHourlyDateWithoutMinutes,
  isWithin5Minutes,
  cleanData,
  formatFrenchDate,
  isDateToday,
};

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

module.exports = { convertToJson, convertMapToObject, hasSameImeiAndTimestamp };

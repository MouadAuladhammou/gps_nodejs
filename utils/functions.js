const redisClientPromise = require("../config/redis");
const DEFAULT_CACHE_EXPIRATION = process.env.DEFAULT_CACHE_EXPIRATION || 20; // secondes

// Fonction pour vérifier la validité d'une date et heure
const isValidDateTime = (dateTimeString) => {
  const dateTimeRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;
  return dateTimeRegex.test(dateTimeString);
};

// Fonction pour convertir une date et heure au format "DD/MM/YYYY HH:mm:ss" en objet Date
const parseDateTime = (dateTimeString) => {
  const [date, time] = dateTimeString.split(" ");
  const [day, month, year] = date.split("/");
  const [hours, minutes, seconds] = time.split(":");
  return new Date(+year, +month - 1, +day, +hours, +minutes, +seconds);
};

// récupérer les données du cache si elles ne sont pas expirées, sinon récupérer les données de la base de données, puis les enregistrer dans le cache
const getOrSetCache = async (key, callback) => {
  const redisClient = await redisClientPromise;
  return new Promise(async (resolve, reject) => {
    const dataHistory = await redisClient.get(key);
    if (dataHistory) {
      console.log("Cache Hit");
      resolve({ ...JSON.parse(dataHistory), isCached: true });
    } else {
      console.log("Cache Miss");
      try {
        const freshDataHistory = await callback();
        redisClient.set(key, JSON.stringify(freshDataHistory), {
          // EX: accepts a value with the cache duration in seconds.
          // NX: when set to true, it ensures that the set() method should only set a key that doesn’t already exist in Redis.
          EX: DEFAULT_CACHE_EXPIRATION,
          NX: true,
        });

        resolve({ ...freshDataHistory, isCached: false });
      } catch (error) {
        // redisClient.quit(); // Fermer le client Redis en cas d'erreur
        reject(error);
      } finally {
        // redisClient.quit(); // Fermer le client Redis dans tous les cas
      }
    }
  });
};

module.exports = { isValidDateTime, parseDateTime, getOrSetCache };

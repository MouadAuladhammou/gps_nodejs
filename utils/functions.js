const redisClientPromise = require("../config/redis");
const DEFAULT_CACHE_EXPIRATION = process.env.DEFAULT_CACHE_EXPIRATION || 120; // secondes
const { Vehicle, Setting, Group, Rule } = require("../models/index.js");
const { GeoConfiguration } = require("../models/geographic.js");
const { createLocationModel } = require("../models/location.js");
const pointInPolygon = require("point-in-polygon");

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

// Récupérer les paramètres de notifications de IMEI depuis Redis, s'il existe, récupérer-le, sinon créer-le et enregistrer-le avec un délai pour les récupérer la prochaine fois depuis Redis
const getVehicleWithSettings = async (imei) => {
  return await getOrSetCache(`dataSettings?imei=${imei}`, async () => {
    try {
      const vehicleInstance = await Vehicle.findOne({
        where: { imei: imei },
        include: [
          {
            model: Group,
            as: "group",
            attributes: ["name", "user_id"],
            include: [
              {
                model: Setting,
                as: "setting",
                attributes: ["name"],
                include: [
                  {
                    model: Rule,
                    as: "rules",
                    attributes: ["id", "name", "type", "value", "params"],
                  },
                ],
              },
            ],
          },
        ],
      });

      const dataSettings = vehicleInstance.get(); // récupérer les données sous forme d'objet JavaScript simple
      const rules = dataSettings?.group?.setting?.rules || [];
      if (rules.length > 0) {
        // ============ Initialize Type:1 => Geo zone ============ //
        // NB: "rule.value" est équivalente au champ "polygon.properties.id" (dans MongoDB) qui est un champ unique qui contient la valeur "timestamp" de la création, concaténé avec le "userid" à la fin
        const ruleValues = rules
          .filter((rule) => rule.type === 1)
          .map((rule) => rule.value);

        if (ruleValues.length > 0) {
          // ici il récupére un seul document complet de la collection "geo_configurations" de l'utilisateur concerné qui contient tous les polygons d'utilisateur possibles
          //   NB: "ruleValues" ne contiennent que les "ids" de polygones de l'utilisateur concérné provenant de son document "geo_configurations" en fonction de la valeur IMEI qui est unique et attribuée à un seul utilisateur
          // NB: On fait destruct pour se débarrasser de l'objet "_id". puisque même on fait: select("polygons") mais cela retourné avec l'objet "_id"
          const { polygons } = await GeoConfiguration.findOne({
            "polygons.properties.id": { $in: ruleValues },
          }).select("polygons");

          // comparer les "rule values" de IMEI de Mysql avec ce qui est renvoyé par MongoDB pour récupérer les coordonnées du polygon concerné
          if (polygons && polygons.length > 0) {
            for (const rule of rules) {
              if (rule.type === 1) {
                const matchingPolygon = polygons.find(
                  (polygon) => polygon.properties.id == rule.value
                );

                if (matchingPolygon) {
                  // NB: lorsque modifier "rule.polygon = polygon", cela affectera automatiquement la variable "dataSettings?.group?.setting?.rules" car "rules" est une référence à la même instance de l'objet que "dataSettings?.group?.setting?.rules"
                  rule.polygon = matchingPolygon;
                  rule.dataValues.polygon = matchingPolygon; // c'est pour le cas de l'exécution d'une récupération de données de MongodDB
                }
              }
            }
          }
        }

        // ============ Initialize Type:4 => travel distance ============ //
        // récupérer le dernier historique de localisation enregistré dans mongodb (locations) pour calculer la distance parcourue de jour en cours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0); // Début de la journée d'hier
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999); // Fin de la journée d'hier

        // Créer le modèle pour la collection 'user_x__locations'
        const Location = createLocationModel(dataSettings.group.user_id);
        const lastRecordLocation = await Location.findOne({
          imei: imei,
          timestamp: {
            $gte: yesterday, // Date de début d'hier
            $lte: endOfYesterday, // Date de fin d'hier
          },
        })
          .select("ioElements") // Sélectionner uniquement la propriété "ioElements"
          .sort({ timestamp: -1 }) // Trier par ordre décroissant de "timestamp" pour obtenir le dernier enregistrement
          .exec();

        const totalOdometerValue =
          lastRecordLocation?.ioElements?.["Total Odometer"] ?? 0;

        dataSettings.totalOdometerValue = totalOdometerValue || 0; // s'il n'y a pas d'enregistrements pour hier, initialiser le à 0
      }

      return dataSettings;
    } catch (error) {
      throw new Error(error);
    }
  });
};

// Gestion des notifications en fonction des régles du véhicule
const manageNotifications = async (vehicleWithSettings, values) => {
  return new Promise((resolve, reject) => {
    if (!values.notifications) {
      values.notifications = [];
    }
    (vehicleWithSettings.group.setting.rules || []).map((rule) => {
      // ============ Type:1 => Geo zone ============ //
      if (rule.type === 1 && rule.polygon?.geometry?.coordinates) {
        // Définir les coordonnées du point et du polygone
        const point = [values.gps.longitude, values.gps.latitude];
        const polygonCoordinates = rule.polygon.geometry.coordinates[0];
        // Vérifier si le point se trouve à l'intérieur du polygone, si c'est le cas initialiser la variable "notify" à la variable "values" pour envoyer la notification
        if (
          pointInPolygon(point, polygonCoordinates) &&
          rule.params === "entry"
        ) {
          values.notifications.push({
            show: true,
            type: 1,
            message: `Le véhicule ${vehicleWithSettings.make} ${
              vehicleWithSettings.make
            } ${vehicleWithSettings.model} d'immatriculation: ${
              vehicleWithSettings.registration_number
            } est à l'intérieur du polygone ${
              rule.polygon?.properties.desc || rule.polygon?.properties.id
            }`,
          });
        }
        if (
          !pointInPolygon(point, polygonCoordinates) &&
          rule.params === "exit"
        ) {
          values.notifications.push({
            show: true,
            type: 1,
            message: `Le véhicule ${vehicleWithSettings.make} ${
              vehicleWithSettings.make
            } ${vehicleWithSettings.model} d'immatriculation: ${
              vehicleWithSettings.registration_number
            } est à l'extérieur du polygone ${
              rule.polygon?.properties.desc || rule.polygon?.properties.id
            }`,
          });
        }

        // ============ Type:2 => Speed limit ============ //
      } else if (rule.type === 2) {
        if (parseInt(values?.gps?.speed) > parseInt(rule.value)) {
          values.notifications.push({
            show: true,
            type: 2,
            message: `Le véhicule ${vehicleWithSettings.registration_number} a dépassé la limite de vitesse de ${rule.value} Km/h en atteignant ${values.gps.speed} km/h`,
          });
        }
        // ============ Type:3 => fuel consumption ============ //
      } else if (rule.type === 3) {
        // if (rule.value > values?.XXX) {
        //   values.notifications.push({
        //     show: true,
        //     type: 3,
        //     message: `Le véhicule ${vehicleWithSettings.registration_number} a dépassé sa consommation de gasoil qui est fixée à ${values?.gps?.Speed} litres`,
        //   });
        // }
        // ============ Type:4 => travel distance ============ //
      } else if (rule.type === 4) {
        const currentTotalOdometer = parseInt(
          values?.ioElements["Total Odometer"]
        );
        const vehicleTotalOdometer = parseInt(
          vehicleWithSettings.totalOdometerValue
        );
        const exceededValue = currentTotalOdometer - vehicleTotalOdometer;
        if (exceededValue > rule.value) {
          const registrationNumber = vehicleWithSettings.registration_number;
          const message = `Le véhicule ${registrationNumber} a dépassé le kilométrage fixé de ${rule.value} Km/jour en atteignant ${exceededValue} Km/jour`;
          values.notifications.push({
            show: true,
            type: 4,
            message: message,
          });
        }
      }
    });
    resolve(values);
  });
};

module.exports = {
  isValidDateTime,
  parseDateTime,
  getOrSetCache,
  getVehicleWithSettings,
  manageNotifications,
};

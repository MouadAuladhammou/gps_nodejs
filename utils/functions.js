const createRedisClient = require("../config/redis");
const redisClientPromiseDb2 = createRedisClient(2);
const redisClientPromiseDb3 = createRedisClient(3);
const redisClientPromiseDb4 = createRedisClient(4);
const redisClientPromiseDb5 = createRedisClient(5);
const redisClientPromiseDb6 = createRedisClient(6);

const DEFAULT_CACHE_EXPIRATION = process.env.DEFAULT_CACHE_EXPIRATION || 3600; // secondes
const { Vehicle, Setting, User, Group, Rule } = require("../models/index.js");
const { GeoConfiguration } = require("../models/geographic.js");
const { createLocationModel } = require("../models/location.js");
const pointInPolygon = require("point-in-polygon");
const {
  convertToJson,
  convertMapToObject,
  getHourlyDateWithoutMinutes,
} = require("../utils/helpers");

// RabbitMQ
const rabbitMQChannel = require("../config/rabbitmq");
const mongoDBQueueName = "mongoDBQueue"; // nom de la file d'attente (Queue) RabbitMQ
const smsQueueName = "smsQueue";

const oneHourInMillis = 60 * 60 * 1000; // Une heure en millisecondes
const redisKey = "gpsClientsConnected";
const refreshTokenKey = "clientRefreshTokens";

// ======================================================== [ Fonctions App ] ======================================================== //
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
const getOrSetCache = async (key, cacheExpiration = null, callback) => {
  key = key.replace(/\s+/g, "");
  const redisClient = await redisClientPromiseDb2;

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
          EX: cacheExpiration || DEFAULT_CACHE_EXPIRATION,
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
  return await getOrSetCache(`dataSettings?imei:${imei}`, 300, async () => {
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
                model: User,
                as: "user",
                attributes: ["cell_phone", "work_phone"],
              },
              {
                model: Setting,
                as: "setting",
                attributes: ["name", "status"],
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
        /*
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
        */

        const Location = createLocationModel(dataSettings.group.user_id);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0); // Début de la journée d'aujourd'hui
        // Rechercher le dernier enregistrement jusqu'à la date d'hier (excluant la date d'aujourd'hui)
        const lastRecordLocation = await Location.findOne({
          imei: imei,
          timestamp: {
            $lt: todayStart, // Date de début d'aujourd'hui exclue
          },
        })
          .select("ioElements") // Sélectionner uniquement la propriété "ioElements"
          .sort({ timestamp: -1 }) // Trier par ordre décroissant de "timestamp" pour obtenir le dernier enregistrement
          .exec();

        const totalOdometerValue =
          lastRecordLocation?.ioElements?.["Total Odometer"] || null; // s'il n'y a pas d'enregistrements, initialiser le à 0

        dataSettings.totalOdometerValue = totalOdometerValue;
      }

      return dataSettings;
    } catch (error) {
      throw new Error(error);
    }
  });
};

// Récupérer tous les véhicules de tous les utilisateurs depuis Redis, s'il existe, récupérer-le, sinon créer-le et enregistrer-le avec un délai pour les récupérer la prochaine fois depuis Redis
const getAllVehiclesGroupedByUser = async () => {
  return await getOrSetCache(`vehiclesGroupedByUser`, 300, async () => {
    try {
      const vehicles = await Vehicle.findAll({
        include: [
          {
            model: Group,
            as: "group",
            attributes: ["name", "user_id"],
          },
        ],
      });

      const vehiclesAsJson = convertToJson(vehicles);

      // Créer un objet Map pour grouper les véhicules par utilisateur
      const vehiclesGroupedByUser = new Map();

      vehiclesAsJson.forEach((vehicle) => {
        const userId = vehicle.group.user_id; // Utiliser "user_id" de la relation pour récupérer l'ID de l'utilisateur
        if (!vehiclesGroupedByUser.has(userId)) {
          // Si l'utilisateur n'existe pas encore dans l'objet Map, ajouter une nouvelle entrée avec un tableau vide pour stocker ses véhicules
          vehiclesGroupedByUser.set(userId, []);
        }
        // Ajouter le véhicule au tableau correspondant à l'utilisateur
        vehiclesGroupedByUser.get(userId).push(vehicle);
      });

      const vehiclesGroupedByUserObj = convertMapToObject(
        vehiclesGroupedByUser
      );

      return vehiclesGroupedByUserObj;
    } catch (error) {
      console.error("Error: ", error);
      throw new Error("Internal Server Error");
    }
  });
};

// Gestion des notifications en fonction des régles du véhicule
const manageNotifications = async (vehicleWithSettings, values) => {
  return new Promise((resolve, reject) => {
    if (!values.notifications) {
      values.notifications = [];
    }

    // Ajouter un numéro de téléphone à utiliser pour envoyer des SMS en cas de notification
    if (!values.userPhoneNumber) {
      values.userPhoneNumber = vehicleWithSettings?.group?.user?.cell_phone;
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
            message: `Le véhicule ${vehicleWithSettings.registration_number} 
              est à l'intérieur du polygone 
              ${rule.polygon?.properties.desc || rule.polygon?.properties.id}`,
          });
        }
        if (
          !pointInPolygon(point, polygonCoordinates) &&
          rule.params === "exit"
        ) {
          values.notifications.push({
            show: true,
            type: 1,
            message: `Le véhicule ${vehicleWithSettings.registration_number} 
              est à l'extérieur du polygone
              ${rule.polygon?.properties.desc || rule.polygon?.properties.id}`,
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
          vehicleWithSettings.totalOdometerValue ||
            values?.ioElements["Total Odometer"]
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

// Récupérer le nombre de véhicules connectés d'un utilisateur
const getImeisByUser = async (userId) => {
  const groupsWithVehicles = await Group.findAll({
    attributes: ["id", "user_id", "vehicles.imei"], // Sélectionner les attributs à inclure dans le résultat
    where: { user_id: userId },
    order: [["name", "ASC"]], // Trier des résultats par nom dans l'ordre croissant
    include: [
      {
        model: Vehicle,
        as: "vehicles",
        attributes: ["id", "imei"],
      },
    ],
  });
  const imeis = groupsWithVehicles
    ? groupsWithVehicles.flatMap((item) =>
        item.vehicles.map((vehicle) => vehicle.imei)
      )
    : [];
  return imeis;
};

const getUserImeisByImei = async (imei) => {
  try {
    // Recherchez l'utilisateur associé à l'IMEI d'entrée
    const user = await User.findOne({
      attributes: ["id"],
      include: [
        {
          model: Group,
          as: "groupes",
          attributes: [],
          include: [
            {
              model: Vehicle,
              as: "vehicles",
              attributes: [],
              where: {
                imei: imei,
              },
            },
          ],
        },
      ],
    });
    const userId = user.id || false;
    if (userId) {
      // Recherchez toutes les IMEIs associées à l'utilisateur
      const imeis = await getImeisByUser(userId);
      return { imeis, userId };
    } else {
      return {};
    }
  } catch (e) {
    console.log("Error", e);
  }
};

// ======================================================== [ Fonctions Rdis ] ======================================================== //
// NB: Clé: latestDataFromGPSClients => contient les dernières données pour tous les appareils GPS en cours d'exécution (qui sont connectés en temps réel)

// Fonction pour récupérer les données associées à un imei
async function getLatestData(imei) {
  const redisClient = await redisClientPromiseDb4;
  // Si l'imei n'est pas dans la Map(), essayons de le récupérer depuis Redis.
  const latestData = await redisClient.get(`latestDataFromGPSClients:${imei}`);
  const parsedValue = latestData ? JSON.parse(latestData) : null; // Utilisez un objet vide par défaut
  return parsedValue;
}

// Fonction pour ajouter ou mettre à jour les données dans la Map() et dans Redis
async function setLatestData(imei, values) {
  const redisClient = await redisClientPromiseDb4;
  redisClient.setEx(
    `latestDataFromGPSClients:${imei}`,
    120,
    JSON.stringify(values)
  );
}

// Fonction pour supprimer les données de Redis
async function deleteLatestData(imei) {
  const redisClient = await redisClientPromiseDb4;
  redisClient.del(`latestDataFromGPSClients:${imei}`);
}

// Fonction pour vérifier si un imei est connecté
async function isIMEIConnected(imei) {
  const redisClient = await redisClientPromiseDb4;
  const exists = await redisClient.exists(`latestDataFromGPSClients:${imei}`);
  return exists;
}

// Récupère toutes les clés qui correspondent à un modèle ("latestDataFromGPSClients")
async function listKeysForGPSClients() {
  const redisClient = await redisClientPromiseDb4;
  const keys = await redisClient.keys("latestDataFromGPSClients:*");
  console.log(
    "Afficher les clés des dernières données reçues pour tous les clients GPS IMEI connectés: ",
    keys
  );
}

// obtenir toutes les clés de notifications
async function listKeysForLatestNotifications() {
  const redisClient = await redisClientPromiseDb3;
  const keys = await redisClient.keys("notification:*");
  console.log(
    "=> => => => => => Clés de notifications existants dans Redis  <= <= <= <= <= <="
  );
  console.log(keys);
}

async function setNotificationDataWithExpiration(notificationKey, data) {
  const redisClient = await redisClientPromiseDb3;
  // Stocker la notification dans Redis avec une expiration d'une heure
  const { notification, userPhoneNumber } = data;
  await redisClient.setEx(
    `notification:${notificationKey}`,
    oneHourInMillis / 1000,
    JSON.stringify({
      notification,
      userPhoneNumber,
    })
  );
}

async function checkNotificationKeyExistence(notificationKey) {
  const redisClient = await redisClientPromiseDb3;
  const exists = await redisClient.exists(`notification:${notificationKey}`);
  return !!exists;
}

// Ajouter un client à la liste Redis lors de la connexion
// NB: "sadd", "srem" et "sismember" il s'agit que la variable "redisKey" n'accepetent pas las valeurs doublons.
const addClientGpsToRedis = async (client) => {
  const redisClient = await redisClientPromiseDb5;
  const clientKey = client.remoteAddress + ":" + client.remotePort;
  redisClient.sAdd(redisKey, clientKey, (err) => {
    if (err) {
      console.error("Erreur lors de l'ajout du client à Redis : ", err);
    }
  });
};

// Supprimer toutes les données associées à variabele redisKey (gpsClientsConnected)
const deleteClientGpsRecord = async () => {
  const redisClient = await redisClientPromiseDb5;
  redisClient.del(redisKey, (err) => {
    if (err) {
      console.error(
        "Erreur lors de la suppression des données de Redis : ",
        err
      );
    }
  });
};

// Supprimer un client de la liste Redis lors de la déconnexion
const removeClientGpsFromRedis = async (client) => {
  const redisClient = await redisClientPromiseDb5;
  const clientKey = client.remoteAddress + ":" + client.remotePort;
  redisClient.sRem(redisKey, clientKey, (err) => {
    if (err) {
      console.error("Erreur lors de la suppression du client de Redis : ", err);
    }
  });
};

// Vérifier la présence d'un client dans la liste Redis
const isClientGpsInRedis = async (client) => {
  const redisClient = await redisClientPromiseDb5;
  const clientKey = client.remoteAddress + ":" + client.remotePort;
  const isExist = await redisClient.sIsMember(redisKey, clientKey);
  return !!isExist;
};

const listGpsClientsConnected = async (imei = null, timestamp = null) => {
  const redisClient = await redisClientPromiseDb5;
  const gpsClientsConnected =
    (await redisClient.sMembers(redisKey)) || "aucun client GPS connécté !";
  imei && timestamp
    ? console.log(
        "imei detected",
        imei,
        "devices tcp connected : =============> ",
        gpsClientsConnected,
        timestamp
      )
    : console.log("Adresses IP du GPS connectés : ", gpsClientsConnected);
};

const getConnectedVehiclesCount = async (imeis) => {
  let connectedVehiclesCount = 0;
  let totalVehicles = 0;
  // Utilisation de Promise.all pour paralléliser les appels à isIMEIConnected
  await Promise.all(
    imeis.map(async (imei) => {
      if (await isIMEIConnected(imei)) connectedVehiclesCount++;
    })
  );
  totalVehicles = imeis.length;
  return { totalVehicles, connectedVehiclesCount };
};

// Ajouter un Refresh Token à la liste Redis lors de la connexion
// NB: "sadd", "srem" et "sismember" il s'agit que la variable "refreshTokenKey" n'accepetent pas las valeurs doublons.
const addTokenToRedis = async (token) => {
  const redisClient = await redisClientPromiseDb6;
  redisClient.sAdd(refreshTokenKey, token, (err) => {
    if (err) {
      console.error("Erreur lors de l'ajout du Token à Redis : ", err);
    }
  });
};

// Supprimer toutes Refresh Tokens associées à variabele redisKey (clientRefreshTokens)
const deleteAllTokensFromRedis = async () => {
  const redisClient = await redisClientPromiseDb6;
  redisClient.del(refreshTokenKey, (err) => {
    if (err) {
      console.error(
        "Erreur lors de la suppression des données de Redis : ",
        err
      );
    }
  });
};

// Supprimer un Refresh Token de la liste Redis lors de la déconnexion
const removeTokenFromRedis = async (token) => {
  const redisClient = await redisClientPromiseDb6;
  redisClient.sRem(refreshTokenKey, token, (err) => {
    if (err) {
      console.error("Erreur lors de la suppression du Token de Redis : ", err);
    }
  });
};

// Vérifier la présence d'un Refresh Token dans la liste Redis
const isTokenInRedis = async (token) => {
  const redisClient = await redisClientPromiseDb6;
  const isExist = await redisClient.sIsMember(refreshTokenKey, token);
  return !!isExist;
};

// ======================================================== [ Fonctions RabbitMQ ] ======================================================== //
// Enregistrer les cordonnées IMEI dans la base de donnée MongoDB
const publishDataToQueues = async (imei, data) => {
  const message = {
    imei: imei,
    gps: data.gps,
    ioElements: data.ioElements,
    timestamp: data.timestamp,
    hour: data.timestamp.getHours(),
    minute: data.timestamp.getMinutes(),
    notifications: data.notifications,
    userPhoneNumber: data.userPhoneNumber,
    created_at: new Date(),
  };

  try {
    const channel = await rabbitMQChannel;

    // Envoyer le message à la file d'attente pour MongoDB
    channel.sendToQueue(
      mongoDBQueueName,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
      }
    );

    // Envoyer le message à la file d'attente pour l'envoi des SMS
    channel.sendToQueue(smsQueueName, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
  } catch (error) {
    console.error("Error sending message to RabbitMQ:", error);
  }
};

// Créer une connexion à RabbitMQ et consommez les messages
const consumeMessagesForMongoDB = async () => {
  try {
    const channel = await rabbitMQChannel;

    // prefetch: La prélecture du canal est une fonctionnalité qui permet de spécifier combien de messages un consommateur peut recevoir et traiter simultanément à partir de la file d'attente
    // il est utilisé pour limiter le nombre de messages préchargés par le consommateur, vous indiquez à RabbitMQ de n'envoyer qu'un seul message à la fois au consommateur
    // chaque consommateur ne recevra qu'un seul message à la fois et ne passera au message suivant qu'après avoir traité le précédent.
    channel.prefetch(10);

    // Consommer les messages de la file d'attente (Queue)
    await channel.consume(mongoDBQueueName, async (message) => {
      if (message !== null) {
        try {
          const gpsData = JSON.parse(message.content.toString());

          // Rappelle: chaque ustilisateur a sa propre collection contenant les données de ses véhicules (les données de GPS)
          const cachedAllVehiclesGroupedByUser =
            await getAllVehiclesGroupedByUser();

          // Trouver le véhicule associé à l'IMEI
          const { imei } = gpsData;
          let vehicleAssociatedWithImei = null;

          // Utiliser Array.prototype.some() pour chercher le véhicule correspondant à l'IMEI
          Object.values(cachedAllVehiclesGroupedByUser).some((vehicles) => {
            vehicleAssociatedWithImei = vehicles.find(
              (vehicle) => vehicle.imei === imei
            );
            return !!vehicleAssociatedWithImei; // Renvoie true pour sortir de la boucle si un véhicule est trouvé
          });

          if (vehicleAssociatedWithImei) {
            const userId = vehicleAssociatedWithImei.group.user_id; // Utiliser "user_id" pour déterminer le nom de la collection
            // Créer le modèle pour la collection 'user_x__locations'
            // const Location = createLocationModel(userId);
            const Location = createLocationModel(3); // ceci juste pour le test
            // Insérer les données dans MongoDB
            await Location.create(gpsData);
            console.log(
              `Message inserted into MongoDB in collection: user_${userId}__locations`,
              gpsData
            );

            // Acknowledge the message: utilisé pour confirmer au serveur RabbitMQ que le message a été traité avec succès et peut être supprimé de la file d'attente.
            channel.ack(message);
          } else {
            // Gérer le cas où l'IMEI n'est pas trouvé dans les véhicules
            throw new Error("IMEI not found in vehicles.");
          }
        } catch (error) {
          console.error("Error:", error);
          // Rejeter (reject) le message en cas d'erreur pour qu'il puisse être traité à nouveau
          channel.reject(message, false);
        }
      }
    });
  } catch (error) {
    console.error("Error connecting to RabbitMQ:", error);
    // process.exit(1); // Quitter l'application en cas d'erreur
  }
};

const consumeMessagesForSMS = async () => {
  const channel = await rabbitMQChannel;
  channel.prefetch(10);
  // Consommer les messages de la file d'attente (Queue)
  await channel.consume(smsQueueName, async (message) => {
    console.log(" ");
    console.log(" ");
    console.log(
      "= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = S"
    );
    await listKeysForLatestNotifications();

    if (message !== null) {
      try {
        const gpsData = JSON.parse(message.content.toString());
        const { imei, timestamp, notifications, userPhoneNumber } = gpsData;
        const hourlyDate = getHourlyDateWithoutMinutes(timestamp);

        if (
          Array.isArray(notifications) &&
          notifications.length > 0 &&
          userPhoneNumber
        ) {
          notifications.forEach(async (notification) => {
            const notificationKey = `${imei}__${notification.type}__${hourlyDate}`;

            const notifKeyIsExist = await checkNotificationKeyExistence(
              notificationKey
            );
            if (!notifKeyIsExist) {
              await setNotificationDataWithExpiration(notificationKey, {
                notification,
                userPhoneNumber,
              });

              // Traitement de l'envoi de SMS en utilisant l'API ...
              console.warn(
                `✉️✉️ 🚀🚀 SMS a été envoyé vers le numéro ${userPhoneNumber} pour la notification : ${notification.type}`
              );
            } else {
              console.warn(
                `✉️✉️ 🛑🛑 Le dernier SMS envoyé pour la notification ${notification.type} n'a pas dépassé une heure`
              );
            }
          });

          // Confirmer la réception et le traitement du message
          channel.ack(message);
        } else {
          console.warn(
            "Pas de notifications dans le message, le message sera rejeté."
          );
          // Gérer le cas où la variable "notifications" ne contient pas de notification à envoyer
          channel.reject(message, false);
        }
      } catch (error) {
        console.error("Erreur :", error);
        channel.reject(message, false);
      }
    }
    console.log(
      "= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = E"
    );
    console.log(" ");
    console.log(" ");
  });
};

module.exports = {
  isValidDateTime,
  parseDateTime,
  getOrSetCache,
  getVehicleWithSettings,
  manageNotifications,
  getAllVehiclesGroupedByUser,
  getImeisByUser,
  getUserImeisByImei,

  getLatestData,
  setLatestData,
  deleteLatestData,
  isIMEIConnected,
  listKeysForGPSClients,
  listKeysForLatestNotifications,
  setNotificationDataWithExpiration,
  checkNotificationKeyExistence,
  addClientGpsToRedis,
  deleteClientGpsRecord,
  removeClientGpsFromRedis,
  isClientGpsInRedis,
  listGpsClientsConnected,
  getConnectedVehiclesCount,
  addTokenToRedis,
  removeTokenFromRedis,
  deleteAllTokensFromRedis,
  isTokenInRedis,

  publishDataToQueues,
  consumeMessagesForMongoDB,
  consumeMessagesForSMS,
};

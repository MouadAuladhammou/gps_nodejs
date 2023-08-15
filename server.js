const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.json());
// const expressDelay = require("express-delay");
// app.use(expressDelay(5000)); // toutes les réponses seront retardées de 5 secondes grâce au middleware "express-delay".
const schedule = require("node-schedule");

const {
  getVehicleWithSettings,
  manageNotifications,
  getAllVehiclesGroupedByUser,
} = require("./utils/functions");

const {
  hasSameImeiAndTimestamp,
  getHourlyDateWithoutMinutes,
} = require("./utils/helpers");

// Socket GPS client (by TCP)
const net = require("net");
const Parser = require("teltonika-parser");
const binutils = require("binutils64");
const { Subject } = require("rxjs");
const latestDataFromGPSClients = new Map(); // contient les dernières données pour tous les appareils GPS en cours d'exécution (qui sont connectés en temps réel)
const gpsClientsSubject = new Subject(); // initialiser une variable de type "Subject" pour détecter les changements en temps réel
const gpsClientsConnected = []; // enregistrer les adresses IP TCP des appareils GPS connectés

// Socket Web client (App)
const server = require("http").createServer(app);
const io = require("socket.io")(server, { cors: { origin: "*" } });
const connectedWebSocketsByIMEI = new Map(); // initialiser une variable pour stocker les sockets Web connéctés correspondant à un IMEI

// Connecter aux bases de données
const connectMongoDB = require("./config/mongodb.js");
const { connectMySQL } = require("./config/mysql.js");
connectMongoDB();
connectMySQL();

// RabbitMQ
const rabbitMQChannel = require("./config/rabbitmq");
const mongoDBQueueName = "mongoDBQueue"; // nom de la file d'attente (Queue) RabbitMQ
const smsQueueName = "smsQueue";

const ExpiringMap = require("./utils/classes/expiringMap.js");
const oneHourInMillis = 60 * 60 * 1000; // Une heure en millisecondes
const latestNotifications = new ExpiringMap(oneHourInMillis); // Utilisation Map de la structure "ExpiringMap" avec un delai d'expiration

// Allow cross-origin
const cors = require("cors");
app.use(cors({ origin: "*" }));

// Models
const { createLocationModel } = require("./models/location.js");

// Modules
const location = require("./modules/location.js");
// const location_graphql = require("./modules/location_graphql.js"); // GraphQL
const user = require("./modules/user.js");
const admin = require("./modules/admin.js");
const geo = require("./modules/geographic.js");
const group = require("./modules/group.js");
const rules = require("./modules/rule.js");
const settings = require("./modules/settings.js");

// Middleware avec un délai de timeout de 5 secondes
var timeout = require("connect-timeout");
app.use(timeout("60s"));

// routes API :
app.use("/api/locations", location);
app.use("/api/users", user);
app.use("/api/admin", admin);
app.use("/api/geo", geo);
app.use("/api/groups", group);
app.use("/api/rules", rules);
app.use("/api/settings", settings);

// Middleware error handler
const errorHandler = require("./middleware/errorHanadler");
app.use(errorHandler);

(async () => {
  // traitement en mode async ...
})();

const rule = new schedule.RecurrenceRule();
rule.hour = 21;
rule.minute = 47;
schedule.scheduleJob(rule, async () => {
  // Traitement quotidien à 21h47 ...
});

// ============================================================================================================================== //
// =========================================================[ RabbitMQ ]========================================================= //
// ============================================================================================================================== //
// Enregistrer les cordonnées IMEI dans la base de donnée MongoDB
async function publishDataToQueues(imei, data) {
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
}

// Créer une connexion à RabbitMQ et consommez les messages
const consumeMessagesForMongoDB = async () => {
  try {
    const channel = await rabbitMQChannel;

    // prefetch: La prélecture du canal est une fonctionnalité qui permet de spécifier combien de messages un consommateur peut recevoir et traiter simultanément à partir de la file d'attente
    // il est utilisé pour limiter le nombre de messages préchargés par le consommateur, vous indiquez à RabbitMQ de n'envoyer qu'un seul message à la fois au consommateur
    // chaque consommateur ne recevra qu'un seul message à la fois et ne passera au message suivant qu'après avoir traité le précédent.
    // channel.prefetch(1);

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
            const Location = createLocationModel(userId);
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
  // Consommer les messages de la file d'attente (Queue)
  await channel.consume(smsQueueName, async (message) => {
    console.log("= =  = =  = =  = =  = =  = =  = =  = =  = =  = =  = =");
    console.log(
      "=> => => => => => all latestNotifications <= <= <= <= <= <=",
      latestNotifications.listAll()
    );
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
          notifications.forEach((notification) => {
            const notificationKey = `${imei}__${notification.type}__${hourlyDate}`;

            if (!latestNotifications.has(notificationKey)) {
              latestNotifications.set(notificationKey, {
                notification,
                userPhoneNumber,
              });

              // Traitement de l'envoi de SMS en utilisant l'API ...
              console.warn(
                `=> SMS a été envoyé vers le numéro ${userPhoneNumber} pour la notification : ${notification.type}`
              );
            } else {
              console.warn(
                `=> Le dernier SMS envoyé pour la notification ${notification.type} n'a pas dépassé une heure`
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
    console.log("= =  = =  = =  = =  = =  = =  = =  = =  = =  = =  = =");
    console.log(" ");
    console.log(" ");
  });
};

consumeMessagesForMongoDB();
consumeMessagesForSMS();

// ============================================================================================================================== //
// ======================================================[ Socket GPS TCP ]====================================================== //
// ============================================================================================================================== //
// NB:
// Ce code ne permet pas de créer plusieurs serveurs pour chaque client connecté.
// Il crée simplement un serveur TCP (trackingServer) avec une connexion active pour chaque client GPS connecté.
// Les clients GPS se connectent au serveur et chaque fois qu'un client se connecte, une nouvelle connexion est établie. Toutes les connexions sont gérées par le même serveur.

// observer les changements de valeurs IMEI
const observeChanges = async (imei, values) => {
  const previousValues = latestDataFromGPSClients.get(imei);
  latestDataFromGPSClients.set(imei, values);
  // Vérifie si les valeurs ont changé
  if (!hasSameImeiAndTimestamp(previousValues, values)) {
    // Initialisation de données de notification (étape 1) :
    const vehicleWithSettings = await getVehicleWithSettings(imei);

    // Gestion des notifications (étape 2) :
    const valuesWithNotifs = await manageNotifications(
      vehicleWithSettings,
      values
    );

    // S'il a changé, effectuer l'action "next" sur la variable "gpsClientsSubject" afin qu'elle soit détectée et accessible dans le traitement du socket Web
    gpsClientsSubject.next({ imei, values: valuesWithNotifs });

    // Envoyer les données à RabbitMQ pour consommation
    publishDataToQueues(imei, valuesWithNotifs);
  }
};

const CLIENT_TIMEOUT_DURATION =
  parseInt(process.env.CLIENT_TIMEOUT_DURATION_MS) || 60000;

const trackingServer = net.createServer((c) => {
  let imei; // Initialiser la variable IMEI provenant de la nouvelle connexion TCP

  // Définir le délai d'expiration de la connexion TCP de l'appareil
  c.setKeepAlive(true, 500);
  c.setNoDelay(true);
  // définir 60 secondes de TIMEOUT pour chaque appareil GPS connecté, si cela se produit, il sera automatiquement déconnecté du serveur
  c.setTimeout(CLIENT_TIMEOUT_DURATION, () => {
    closeTCPIPConnection();
  });

  // ceci juste pour tester les erreurs de connexions TCP
  /*
  setInterval(() => {
    c.emit("error", new Error("*** Custom error message ***"));
  }, 138000);
  */

  // Fermer la connexion TCP
  function closeTCPIPConnection() {
    console.log("connexion", c.remoteAddress + ":" + c.remotePort);
    // Trouver l'index de l'élément correspondant à la variable "c"
    const index = gpsClientsConnected.findIndex(
      (element) => element === c.remoteAddress + ":" + c.remotePort
    );
    // Vérifier si l'élément a été trouvé
    if (index !== -1) {
      gpsClientsConnected.splice(index, 1); // Supprimer l'élément à l'index correspondant
      console.log(
        "connexion will be closed",
        c.remoteAddress + ":" + c.remotePort
      );
    }
    latestDataFromGPSClients.delete(imei);
    c.destroy(); // NB: ici, il déclenche => c.on("close", () => { ... });
    c.end(); // NB: cela n'a aucun impact !
  }

  // Créer une nouvelle connexion avec un nouveau client GPS connecté au même serveur
  c.on("data", (data) => {
    try {
      let buffer = data;
      let parser = new Parser(buffer);
      if (parser.isImei) {
        imei = parser.imei;
        // observeChanges(parser.imei, { imei: parser.imei });
        c.write(Buffer.alloc(1, 1)); // send ACK for IMEI
        console.log("client device imei connected : " + parser.imei);
        gpsClientsConnected.push(c.remoteAddress + ":" + c.remotePort);
        console.log(
          "new client device imei connected from" +
            c.remoteAddress +
            ":" +
            c.remotePort
        );
      } else {
        let avl = parser.getAvl();
        // console.log("Avl: ", JSON.stringify(avl));
        // Récupérer des données de l'appareil GPS
        avl.records?.map(({ gps, timestamp, ioElements: elements }) => {
          let ioElements = {};
          for (let key in elements) {
            if (elements.hasOwnProperty(key)) {
              let data = elements[key].value;
              ioElements[elements[key].label] = data;
            }
          }

          // Enregistrer les données dans la base de données MongoDB
          console.log("gps", gps);
          console.log("timestamp", timestamp);

          if (gps.longitude && gps.latitude) {
            // mettre à jour les données du client GPS avec les dernières données reçues pour etre détecté et envoyé par la suite dans les web sockets
            observeChanges(imei, { gps, timestamp, ioElements, imei });
          }

          // réinitialiser le délai lorsqu'il y a des données
          c.setTimeout(CLIENT_TIMEOUT_DURATION);

          console.log(
            "imei detected",
            imei,
            "devices tcp connected : =============> ",
            gpsClientsConnected,
            timestamp
          );
        });

        let writer = new binutils.BinaryWriter();
        writer.WriteInt32(avl.number_of_data);

        let response = writer.ByteBuffer;
        c.write(response); // send ACK
      }
    } catch (e) {
      console.log("catch error :", e);
    }
  });

  c.on("close", () => {
    console.log("close => client device imei disconnected ... ! ");
    closeTCPIPConnection();
  });

  c.on("end", () => {
    console.log("end => client device imei disconnected ... ! ");
    closeTCPIPConnection();
  });

  c.on("error", (err) => {
    console.log("error => client device imei connection error : ", err);
    closeTCPIPConnection();
  });
});

trackingServer.listen(5002, "0.0.0.0", () => {
  console.log("Server listening on 64.226.124.200:5002");
});

trackingServer.on("error", (err) => {
  console.error(`Server error: ${err}`);
});

// Marque le serveur pour qu'il ne soit plus considéré comme bloquant
// trackingServer.unref();

// ============================================================================================================================== //
// ==================================================[ Socket Web Application ]================================================== //
// ============================================================================================================================== //
io.on("connection", (socket) => {
  console.log(`Nouvelle connexion Web socket - id: ${socket.id}`);

  socket.on("join", (imeis) => {
    console.log("join ", imeis);

    // chaque IMEI (appareil GPS) peut avoir un ou plusieurs sockets de différents navigateurs
    imeis.forEach((imei) => {
      connectedWebSocketsByIMEI.set(
        imei,
        connectedWebSocketsByIMEI.get(imei) || new Set()
      );
      connectedWebSocketsByIMEI.get(imei).add(socket);
    });
  });

  socket.on("disconnecting", () => {
    console.log("disconnecting...");
    const socketId = socket.id;
    connectedWebSocketsByIMEI.forEach((socketsForImei, imei) => {
      const socketsArray = Array.from(socketsForImei); // Convertir l'ensemble en tableau
      const index = socketsArray.findIndex((s) => s.id === socketId); // Rechercher l'indice du socket dans le tableau
      if (index >= 0) {
        socketsArray.splice(index, 1); // Supprimer le socket pour cet IMEI concerné
        if (socketsArray.length === 0) {
          connectedWebSocketsByIMEI.delete(imei);
        } else {
          connectedWebSocketsByIMEI.set(imei, new Set(socketsArray)); // Mettre à jour l'ensemble avec le tableau modifié
        }
      }
    });
    console.log(`Socket ${socket.id} a été déconnecté`);
  });
});

// Détecter les données qui ont changé depuis un IMEI, puis à les envoyer à tous les sockets Web pertinents (NB: incluant les sockets de type "notif")
// NB: "values" ce sont des données qui sont envoyées par l'appareil GPS
gpsClientsSubject.subscribe(async ({ imei, values }) => {
  // Envoyer des notifications (étape 3) :
  // =====================================
  const socketsForImeiNotif = connectedWebSocketsByIMEI.get(imei + "_notif");
  if (socketsForImeiNotif) {
    socketsForImeiNotif.forEach((socket) => {
      if (
        values.hasOwnProperty("notifications") &&
        values.notifications.length > 0
      ) {
        console.log(
          "clientData - send notification:",
          "device_imei_" + imei + "_notif",
          values.imei,
          "dans la socket :",
          socket.id
        );
        socket.emit("device_imei_" + imei + "_notif", JSON.stringify(values));
      }
    });
  }

  // Envoyer les données de localisation
  const socketsForImei = connectedWebSocketsByIMEI.get(imei);
  if (socketsForImei) {
    socketsForImei.forEach((socket) => {
      console.log(
        "clientData - send :",
        values.imei,
        "dans la socket :",
        socket.id
      );
      socket.emit("device_imei_" + imei, JSON.stringify(values));
    });
  }
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

// ============================================================================================================================== //
// ===========================================================[ TEST ]=========================================================== //
// ============================================================================================================================== //
// Ceci juste pour tester les envois
/*
let latitude = 35.6791;
let longitude = -5.3291;
setInterval(() => {
  // Tâche à exécuter toutes les 3 secondes
  latitude = latitude - 0.0002;
  longitude = longitude - 0.0002;
  observeChanges("350612076413275", {
    imei: "350612076413275",
    vehicle_id: "350612076413275",
    gps: {
      latitude: latitude,
      longitude: longitude,
      speed: 100,
    },
    ioElements: {
      Ignition: 1,
      Movement: 1,
      "GSM Signal Strength": 5,
      "Sleep Mode": 0,
      "GNSS Status": 1,
      PDOP: 16,
      HDOP: 13,
      "Ext Voltage": 0,
      "Battery Voltage": 3214,
      "Battery Current": 0,
      "GSM Operator": 60401,
      "Total Odometer": 3116,
    },
    timestamp: new Date(),
    created_at: "date time",
  });
}, 10000);
*/

// Ceci juste pour voir ce qui se passe
/**/
setInterval(() => {
  console.log(" ");
  console.log("***********************************");
  // Obtenir le nombre de sockets tcp des appareils connectés
  trackingServer.getConnections((err, count) => {
    if (err) {
      console.log(err);
    } else {
      console.log(
        `nombre de sockets tcp des appareils GPS connectés : ${count}`
      );
    }
  });

  // Obtenir le nombre de sockets Web connectés
  const connectedSocketsCount = io.engine.clientsCount;
  console.log("nombre de Web sockets connectés :", connectedSocketsCount);

  console.log(
    "IMEIS avec ses Web sockets actuelles connectées :",
    Array.from(connectedWebSocketsByIMEI)
  );
  connectedWebSocketsByIMEI.forEach((socketsForImei, imei) => {
    console.log(
      `IMEI: ${imei}, Sockets: ${Array.from(socketsForImei)
        .map((socket) => socket.id)
        .join(", ")}`
    );
  });

  console.log("gpsClientsConnected : ", gpsClientsConnected);
  console.log("clients imeis : ", Array.from(latestDataFromGPSClients.keys()));
  console.log("***********************************");
  console.log(" ");
}, 70000);

const app = require("./app");

const {
  getVehicleWithSettings,
  manageNotifications,
  getImeisByUser,
  getUserImeisByImei,

  getLatestData,
  setLatestData,
  deleteLatestData,
  isIMEIConnected,
  listKeysForGPSClients,
  checkNotificationKeyExistence,
  addClientGpsToRedis,
  removeClientGpsFromRedis,
  deleteClientGpsRecord,
  isClientGpsInRedis,
  listGpsClientsConnected,
  getConnectedVehiclesCount,

  publishDataToQueues,
  publishDataToEmailQueues,
  consumeMessagesForMongoDB,
  consumeMessagesForSMS,
  consumeMessagesReturnEmail,
} = require("./utils/functions");

const {
  hasSameImeiAndTimestamp,
  getHourlyDateWithoutMinutes,
  isDateToday,
} = require("./utils/helpers");

const { verifySocketToken } = require("./middleware/check_token");

// Socket GPS client (by TCP)
const net = require("net");
const Parser = require("teltonika-parser");
const binutils = require("binutils64");

// Connecter aux bases de données
const createRedisClient = require("./config/redis");
const { connectMongoDB } = require("./config/mongodb.js");
const { connectMySQL } = require("./config/mysql.js");
connectMongoDB();
connectMySQL();

(async () => {
  var cluster = require("cluster");
  var os = require("os");

  // Initialiser Map qui va contenir les adresses IP de GPS connectés
  deleteClientGpsRecord();

  if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running ⌛️`);
    for (var i = 0; i < os.cpus().length; i++) {
      cluster.fork();
    }

    cluster.on("exit", function (worker, code, signal) {
      console.log("worker " + worker.process.pid + " died");
    });
  } else {
    console.log(`Worker ${process.pid} started ✅`);
    const { createServer } = require("http");
    const httpServer = createServer(app);

    const io = require("socket.io")(httpServer, {
      transports: ["websocket", "polling"],
    });

    const redisClientPromise = await createRedisClient();

    // Methode 1:
    // const { createAdapter } = require("@socket.io/redis-adapter");
    const pubClient = redisClientPromise;
    const subClient = pubClient.duplicate(); // créer une copie indépendante de "redisClient" appelée "subscriber". (NB: c'est obligatoire !)
    await subClient.connect();
    // io.adapter(createAdapter(pubClient, subClient));

    // Methode 2:
    const { createAdapter } = require("socket.io-redis");
    io.adapter(createAdapter(pubClient, subClient));
    // ======================================================== [ Test API ] ======================================================== //
    let latitude = 35.6791;
    let longitude = -5.3291;
    let speed = 130;
    app.post("/api/test/post/location", (req, res) => {
      latitude = latitude - 0.0002;
      longitude = longitude - 0.0002;
      speed = Math.floor(Math.random() * (300 - 120 + 1)) + 120;
      const clientIP = req.socket.remoteAddress + ":" + req.socket.remotePort;
      const Server = "Server 2";
      const data = req.body;
      observeChanges("350612076413275", {
        imei: "350612076413275",
        vehicle_id: "350612076413275",
        gps: {
          latitude: latitude,
          longitude: longitude,
          speed: speed,
        },
        ioElements: {
          Ignition: Math.round(Math.random()),
          Movement: Math.round(Math.random()),
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
        timestamp: new Date("2024-02-22T17:20:57.033+00:00"),
        created_at: new Date(),
      });
      res.json({
        message:
          clientIP +
          " - Données reçues avec succès ! Répondé par serveur : " +
          Server,
      });
    });
    // ============================================================================================================================== //

    consumeMessagesForMongoDB();
    consumeMessagesForSMS();
    consumeMessagesReturnEmail();

    // ============================================================================================================================== //
    // ======================================================[ Socket GPS TCP ]====================================================== //
    // ============================================================================================================================== //
    // NB:
    // Ce code ne permet pas de créer plusieurs serveurs pour chaque client connecté.
    // Il crée simplement un serveur TCP (trackingServer) avec une connexion active pour chaque client GPS connecté.
    // Les clients GPS se connectent au serveur et chaque fois qu'un client se connecte, une nouvelle connexion est établie. Toutes les connexions sont gérées par le même serveur.

    // observer les changements de valeurs IMEI
    const observeChanges = async (imei, values) => {
      const previousValues = await getLatestData(imei);
      setLatestData(imei, values);
      // Vérifier si les valeurs ont changé
      if (!hasSameImeiAndTimestamp(previousValues, values)) {
        // Initialisation de données de notification (étape 1) :
        const vehicleWithSettings = await getVehicleWithSettings(imei);

        // Gestion des notifications (étape 2) :
        const valuesWithNotifs = await manageNotifications(
          vehicleWithSettings,
          values
        );

        // Enregistrer la notification en tant que notification horaire (étape 3) :
        // NB: Si une notification du même type est détectée dans un délai n'excédant pas une heure, alors elle n'est pas enregistrée en tant que notification qui doit être affichée sur la NavBar
        const hourlyDate = getHourlyDateWithoutMinutes(values.timestamp);
        let emailDataQueue = [];
        if (
          Array.isArray(valuesWithNotifs.notifications) &&
          valuesWithNotifs.notifications.length > 0
        ) {
          // NB: methode "forEach" ne prend pas en charge correctement les fonctions asynchrones. Pour garantir que la variable "valuesWithNotifs" est modifié avant de l'envoyer, on peut utiliser une boucle "for...of" avec async/await, qui prend en charge correctement les opérations asynchrones.
          for (const notification of valuesWithNotifs.notifications) {
            const notificationKey = `${imei}__${notification.type}__${hourlyDate}`;
            // Que l'utilisateur soit connecté ou non,enregistrer la notification (par heure) sous invisible (viewedOnNavBar = false) pour l'afficher dans NavBar comme étant une notification invisible.
            const isSameNotifOnHour = await checkNotificationKeyExistence(
              notificationKey
            );
            if (!isSameNotifOnHour) {
              notification.viewedOnNavBar = false;
              emailDataQueue.push(notification);
            }
          }
        }

        // Initialiser ID d'utilisateur et ses IMEIs associés
        const { imeis = [], userId = null } = await getUserImeisByImei(imei);

        // Initialiser un canal "gpsDataChannell" pour détecter les changements en temps réel des données du GPS connecté via TCP afin qu'elles soient détectées et accessibles dans le traitement du socket Web.
        const redisClient = redisClientPromise;
        isDateToday(values.timestamp) && // Vérifier si la date est d'aujourd'hui
          redisClient.publish(
            "gpsDataChannel",
            JSON.stringify({
              imei,
              values: valuesWithNotifs,
              associatedImeis: imeis,
              userId,
            })
          );

        // Envoyer les données à RabbitMQ pour consommation
        publishDataToQueues(imei, valuesWithNotifs);

        // Envoyer des données à RabbitMQ pour envoyer des e-mails de notification
        emailDataQueue.length > 0 &&
          publishDataToEmailQueues(
            valuesWithNotifs.userId,
            valuesWithNotifs.userEmail,
            valuesWithNotifs.timestamp,
            emailDataQueue
          );
      }
    };

    const sendChartToOpenWebSockets = async (imeis, userId) => {
      if (imeis.length > 0 && userId) {
        const socketIdsInRoom = Array.from(
          io.sockets.adapter.rooms.get(userId) || []
        );

        console.log("socketIdsInRoom - CHART", socketIdsInRoom);
        if (socketIdsInRoom.length > 0 && imeis.length > 0) {
          const { totalVehicles, connectedVehiclesCount } =
            await getConnectedVehiclesCount(imeis);

          console.log(
            "📊📊 📊📊 Envoyer le nombre de véhicules connectés :",
            "chart_" + userId,
            "dans les sockets :",
            socketIdsInRoom
          );
          broadcast(userId, `charts_${userId}`, {
            totalVehicles,
            connectedVehiclesCount,
          });
        }
      }
    };

    const CLIENT_TIMEOUT_DURATION =
      parseInt(process.env.CLIENT_TIMEOUT_DURATION_MS) || 60000;

    const trackingServer = net.createServer((c) => {
      // Initialiser la variable IMEI provenant de la nouvelle connexion TCP
      let imei;

      // Définir le délai d'expiration de la connexion TCP de l'appareil
      c.setKeepAlive(true, 500);
      c.setNoDelay(true);
      // définir 60 secondes de TIMEOUT pour chaque appareil GPS connecté, si cela se produit, il sera automatiquement déconnecté du serveur
      c.setTimeout(CLIENT_TIMEOUT_DURATION, () => {
        console.log("Socket Timeout ...");
        closeTCPIPConnection(imei);
      });

      // ceci juste pour tester les erreurs de connexions TCP
      // setInterval(() => {
      //   c.emit("error", new Error("*** Custom error message ***"));
      // }, 138000);

      // Fermer la connexion TCP
      async function closeTCPIPConnection(imei) {
        console.log(
          "close connexion IMEI: ",
          imei + " => " + c.remoteAddress + ":" + c.remotePort
        );

        await deleteLatestData(imei);
        removeClientGpsFromRedis(c);
        console.log(
          "✂️✂️ connexion TCP will be closed",
          c.remoteAddress + ":" + c.remotePort
        );

        // Initialiser les IMEI associés et leur utilisateur
        const { imeis = [], userId = null } = await getUserImeisByImei(imei);

        // Émet un statut déconnecté pour les sockets Web respectifs dans toutes les Workers
        const redisClient = redisClientPromise;
        redisClient.publish(
          "gpsDataChannel",
          JSON.stringify({
            imei,
            values: null,
            isDisconnected: true,
            associatedImeis: imeis,
            userId,
          })
        );

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
            c.write(Buffer.alloc(1, 1)); // send ACK for IMEI
            console.log("client device imei connected : " + parser.imei);

            addClientGpsToRedis(c);
            console.log(
              "🏁🏁 new client device imei connected from" +
                c.remoteAddress +
                ":" +
                c.remotePort
            );
          } else {
            let avl = parser.getAvl();
            // console.log("Avl: ", JSON.stringify(avl));
            // Récupérer des données de l'appareil GPS
            avl.records?.map(
              async ({ gps, timestamp, ioElements: elements }) => {
                let ioElements = {};
                for (let key in elements) {
                  if (elements.hasOwnProperty(key)) {
                    let data = elements[key].value;
                    ioElements[elements[key].label] = data;
                  }
                }

                // Enregistrer les données dans la base de données MongoDB
                console.log("gps.longitude reçu >>> ", gps.longitude);
                console.log("gps.latitude reçu >>> ", gps.latitude);
                if (gps.longitude && gps.latitude) {
                  // mettre à jour les données du client GPS avec les dernières données reçues pour etre détecté et envoyé par la suite dans les web sockets
                  observeChanges(imei, { gps, timestamp, ioElements, imei });
                }

                // réinitialiser le délai lorsqu'il y a des données
                c.setTimeout(CLIENT_TIMEOUT_DURATION);

                await listGpsClientsConnected(imei, timestamp);
              }
            );

            let writer = new binutils.BinaryWriter();
            writer.WriteInt32(avl.number_of_data);

            let response = writer.ByteBuffer;
            c.write(response); // send ACK
          }
        } catch (e) {
          console.log("❗️❓", e);
        }
      });

      c.on("close", () => {
        console.log("close => client device imei disconnected ... ! ");
        closeTCPIPConnection(imei);
      });

      c.on("end", () => {
        console.log("end => client device imei disconnected ... ! ");
        closeTCPIPConnection(imei);
      });

      c.on("error", (err) => {
        console.log("error => client device imei connection error : ", err);
        closeTCPIPConnection(imei);
      });
    });

    trackingServer.listen(5002, "0.0.0.0", () => {
      console.log("Server listening on 64.226.124.200:5002");
    });

    trackingServer.on("error", (err) => {
      console.error(`Server TCP error: ${err}`);
    });

    // Marque le serveur pour qu'il ne soit plus considéré comme bloquant
    // trackingServer.unref();

    // ============================================================================================================================== //
    // ==================================================[ Socket Web Application ]================================================== //
    // ============================================================================================================================== //
    io.use((socket, next) => {
      verifySocketToken(socket, next);
    }).on("connection", (socket) => {
      console.log(`💻💻 Nouvelle connexion Web socket - id: ${socket.id}`);

      socket.on("join", (imeis, callback) => {
        console.log("join ", imeis);
        if (typeof callback === "function") {
          callback({ status: "ok" });
          imeis.forEach(async (imei) => {
            socket.join(imei);
            const isConnected = await isIMEIConnected(imei);
            broadcast(imei, `device_imei_connected_${imei}`, {
              isConnected,
            });
          });
        }
      });

      socket.on("join_charts", async (userId, callback) => {
        console.log("join_charts ", userId);
        if (typeof callback === "function") {
          callback({ status: "ok" });
          socket.join(userId);
          try {
            if (io.sockets.adapter.rooms.has(userId)) {
              const imeis = await getImeisByUser(userId);
              const { totalVehicles, connectedVehiclesCount } =
                await getConnectedVehiclesCount(imeis);

              broadcast(userId, `charts_${userId}`, {
                totalVehicles,
                connectedVehiclesCount,
              });
            }
          } catch (error) {
            console.error(
              "Une erreur s'est produite lors de la vérification des IMEI :",
              error
            );
          }
        }
      });

      socket.on("join_notifs", (imeis, callback) => {
        console.log("join_notifs ", imeis);
        if (typeof callback === "function") {
          callback({ status: "ok" });
          imeis.forEach((imei) => {
            socket.join(imei);
          });
        }
      });

      socket.on("disconnecting", () => {
        console.log("disconnecting...");
        // Quitter toutes les salles (rooms) pour le socket Web auquel il appartient
        // NB: La variable "socket.rooms" contient également le même ID de socket web concerné, mais cela ne pose aucun problème
        socket.rooms.forEach((imei) => {
          socket.leave(imei); // Quitter la salle (identifiée par IMEI) correspondante
        });

        console.log(`✂️✂️ Socket Web ${socket.id} a été déconnecté`);
      });
    });

    // Détecter les données qui ont changé depuis un IMEI (GPS), puis à les envoyer à tous les sockets Web pertinents (NB: incluant les sockets de type "notif")
    // NB: "values" ce sont des données qui sont envoyées par l'appareil GPS
    try {
      const redisClient = redisClientPromise;
      const subscriber = redisClient.duplicate(); // créer une copie indépendante de "redisClient" appelée "subscriber". (NB: c'est obligatoire !)

      await subscriber.connect();
      // await subscriber.auth({ password: "admin" });
      // NB Important: Tous les Workers du serveur actuel ou d'autres serveurs peuvent y accéder à ce "message" (Si on utilise Ip Privé dans la config Redis)
      await subscriber.subscribe("gpsDataChannel", (message) => {
        const {
          imei,
          values,
          isDisconnected = null,
          associatedImeis = [],
          userId = null,
        } = JSON.parse(message.toString());

        // On peut maintenant gérer les données et les diffuser sur les sockets Web concernées
        const socketIdsInRoom = Array.from(
          io.sockets.adapter.rooms.get(imei) || [] // get sockets on this node
        );
        const socketIdsInRoomNotif = Array.from(
          io.sockets.adapter.rooms.get(`${imei}_notif`) || [] // get sockets on this node
        );
        console.log("socketIdsInRoom - IMEI", socketIdsInRoom);
        console.log("socketIdsInRoomNotif", socketIdsInRoomNotif);

        // Verifier d'abord si le message pour se deconnecter lors de la fermeture de la connexion TCP
        // =====================================
        if (isDisconnected && socketIdsInRoom) {
          // Émet l'état de la connexion connectée aux sockets Web respectives
          console.log(
            "❌❌ ❌❌ Envoyer le signe de deconnexion:",
            "device_imei_connected_" + imei,
            "dans les sockets :",
            socketIdsInRoom
          );
          broadcast(imei, `device_imei_connected_${imei}`, {
            isConnected: false,
          });

          sendChartToOpenWebSockets(associatedImeis, userId);
          return;
        }

        // Envoyer des notifications (étape 3) :
        // =====================================
        if (
          values.hasOwnProperty("notifications") &&
          values.notifications.length > 0
        ) {
          // Envoyer des données de notifications
          if (socketIdsInRoomNotif) {
            console.log(
              "🔔🔔 🔔🔔 Envoyer les notifications:",
              "device_imei_" + imei + "_notif",
              values.imei,
              "dans les sockets :",
              socketIdsInRoomNotif
            );
            broadcast(
              `${imei}_notif`,
              `device_imei_${imei}_notif`,
              JSON.stringify(values)
            );
          }
        }
        // Envoyer des données de localisation
        if (socketIdsInRoom) {
          console.log(
            "🚗🚗 🚗🚗 Envoyer les données gps:",
            `device_imei_${imei}`,
            values.imei,
            "dans les sockets :",
            socketIdsInRoom
          );
          broadcast(imei, `device_imei_${imei}`, JSON.stringify(values));

          // Émet l'état de la connexion connectée aux sockets Web respectives
          broadcast(imei, `device_imei_connected_${imei}`, {
            isConnected: true,
          });

          sendChartToOpenWebSockets(associatedImeis, userId);
        }
      });
    } catch (e) {
      console.log("❗️❓", e);
    }

    function broadcast(imei, eventName, value) {
      // Vérifier si la salle (room) existe déjà. NB: il verifie cette Romm s'il existe juste dans Worker en cours
      if (io.sockets.adapter.rooms.has(imei)) {
        io.local.to(imei).emit(eventName, value); // NB: "local" => for send to all clients on this node (when using multiple nodes)
        console.log(
          "🚀🚀🚀 Broadcast (On -Worker- " + process.pid + ") to the Room -",
          imei,
          "- and Event :",
          eventName,
          "with Values: ",
          value
        );
      } else {
        console.log(
          `🤷‍♂️🤷‍♂️🤷‍♂️ La salle ${imei} pour ${eventName} n'existe pas ! dans -Worker- ${process.pid}`
        );
      }
    }

    const PORT = process.env.PORT || 5001;
    const HOST = "localhost"; // il n'acceptera que les connexions provenant de reseaux local (gateway).
    httpServer.listen(PORT, HOST, () =>
      console.log(`App listening on port ${PORT}`)
    );

    // ============================================================================================================================== //
    // ===========================================================[ TEST ]=========================================================== //
    // ============================================================================================================================== //
    try {
      const redisClient = await createRedisClient(3);
      const globalValue = await redisClient.get("global_value");
      if (globalValue) {
        const incrementedValue = parseInt(globalValue) + 1;
        await redisClient.set("global_value", incrementedValue, {
          // EX: DEFAULT_CACHE_EXPIRATION,
          XX: true, // Utilisez XX au lieu de NX pour mettre à jour si la clé existe
        });
        console.log("globalValue", incrementedValue); // Afficher la valeur incrémentée
      } else {
        await redisClient.set("global_value", 1, {
          // EX: DEFAULT_CACHE_EXPIRATION,
          NX: true,
        });
        console.log("globalValue", 1); // Afficher la nouvelle valeur (1)
      }
    } catch (e) {
      console.log("❗️❓", e);
    }

    // Ceci juste pour voir ce qui se passe
    /**/
    setInterval(displaySocketInfo, 30000);
    async function displaySocketInfo() {
      console.log("\n");
      console.log(
        "********************************************************************************************************************************************"
      );
      // Obtenir le nombre de sockets TCP pour les appareils GPS connectés
      const getConnections = () => {
        return new Promise((resolve, reject) => {
          trackingServer.getConnections((err, count) => {
            if (err) {
              reject(err);
            } else {
              resolve(count);
            }
          });
        });
      };

      try {
        const count = await getConnections();
        console.log(
          `Nombre de sockets TCP pour les appareils GPS connectés dans -Worker- ${process.pid} : ${count}`
        );
      } catch (err) {
        console.error("❗️❓", err);
      }

      // Obtenir le nombre de sockets Web connectés
      const connectedSocketsCount = io.engine.clientsCount;
      console.log(
        `Nombre de sockets Web connectées dans -Worker- ${process.pid} : ${connectedSocketsCount}`
      );

      console.log("\n");

      // Pour afficher les sockets ID connectés
      console.log(
        `*** Tous les ID de socket Web sont actuellement connectés dans -Worker- ${process.pid} : ***`
      );
      console.log([...io.sockets.sockets.keys()]);

      console.log("\n");

      console.log(
        "*** Toutes les salles (rooms) et sockets Web auxquelles il appartient : ***"
      );
      const rooms = io.sockets.adapter.rooms;
      // console.log("Show all rooms : ", rooms.keys());
      for (const room of rooms.keys()) {
        const sockets = await io.in(room).fetchSockets(); // NB Important: si "@socket.io/redis-adapter" est utilisé, la fonction "fetchSockets()" va récupèrer toutes les sockets qu'ils appartient dans cette "room" en cours même ces sockets se trouvent dans les autres Workers
        if (room === sockets[0].id) continue;
        console.log("Room : " + room);
        sockets.forEach((socket) => {
          console.log(" ==> Socket: ", socket.id); // Affiche l'ID de la socket
        });
      }

      console.log("\n");

      console.log(
        "*** Toutes les Sockets GPS TCP actuellement connectées : ***"
      );
      // console.log("Adresses IP du GPS connecté : ", gpsClientsConnected);
      await listGpsClientsConnected();

      await listKeysForGPSClients(); // afficher les dernières données reçues pour tous les clients GPS IMEI connectés

      console.log(
        "********************************************************************************************************************************************"
      );
      console.log("\n");
    }
  }
})();

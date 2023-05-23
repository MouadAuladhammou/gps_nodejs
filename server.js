const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.json());

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

// Allow cross-origin
const cors = require("cors");
app.use(cors({ origin: "*" }));
app.use(cors());

// connect DB
require("./config/mongodb.js");
require("./config/mysql.js");

// Models
var { Location } = require("./models/location.js");

// Modules
const location = require("./modules/location.js");
const location_graphql = require("./modules/location_graphql.js"); // GraphQL
const user = require("./modules/user.js");
const admin = require("./modules/admin.js");
const map = require("./modules/map.js");
const geographic = require("./modules/geographic.js");

// routes API :
app.use("/api/locations", location);
app.use("/api/users", user);
app.use("/api/admin", admin);
app.use("/api/map", map);
app.use("/api/geographic", geographic);

// ============================================================================================================================== //
// ======================================================[ Socket GPS TCP ]====================================================== //
// ============================================================================================================================== //
// NB:
// Ce code ne permet pas de créer plusieurs serveurs pour chaque client connecté.
// Il crée simplement un serveur TCP (trackingServer) avec une connexion active pour chaque client GPS connecté.
// Les clients GPS se connectent au serveur et chaque fois qu'un client se connecte, une nouvelle connexion est établie. Toutes les connexions sont gérées par le même serveur.

// Comparaison d'un objet précédent avec l'objet IMEI actuel
function areValuesEqual(obj1, obj2) {
  return (
    obj1 && obj2 && obj1.imei === obj2.imei && obj1.timestamp === obj2.timestamp
  );
}

// observer les changements de valeurs IMEI
const observeChanges = (imei, values) => {
  const previousValues = latestDataFromGPSClients.get(imei);
  latestDataFromGPSClients.set(imei, values);
  // Vérifie si les valeurs ont changé
  if (!areValuesEqual(previousValues, values)) {
    // S'il a changé, effectuer l'action "next" sur la variable "gpsClientsSubject" afin qu'elle soit détectée et accessible dans le traitement du socket Web
    gpsClientsSubject.next({ imei, values });
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
        observeChanges(parser.imei, { imei: parser.imei });
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
          // ...

          // mettre à jour les données du client GPS avec les dernières données reçues pour etre détecté et envoyé par la suite dans les web sockets
          observeChanges(imei, { gps, timestamp, ioElements, imei });

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

// Détecter les données qui ont changé depuis un IMEI, puis à les envoyer à tous les sockets Web pertinents
gpsClientsSubject.subscribe(({ imei, values }) => {
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
let latitude = 35.679052;
let longitude = -5.329702;
setInterval(() => {
  // Tâche à exécuter toutes les 3 secondes
  console.log("observeChanges");
  latitude = latitude - 0.0002;
  longitude = longitude - 0.0002;
  observeChanges("350612076413275", {
    imei: "350612076413275",
    vehicle_id: "350612076413275",
    gps: {
      latitude: latitude,
      longitude: longitude,
    },
    created_at: "date time",
  });
}, 5000);
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

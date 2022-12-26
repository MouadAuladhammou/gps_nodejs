const express = require("express");
const expressGraphQL = require("express-graphql").graphqlHTTP;
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, { cors: { origin: "*" } });
app.use(bodyParser.json());

// Allow cross-origin
app.use(cors({ origin: "http://localhost:4200" }));
app.use(cors());

// connect DB
require("./config/mongodb.js");
require("./config/mysql.js");

// Models
var { Location } = require("./models/location");

// Modules
const location = require("./modules/location");
const location_graphql = require("./modules/location_graphql"); // GraphQL
const user = require("./modules/user");
const map = require("./modules/map");
const geographic = require("./modules/geographic");

// routes
app.use("/api/locations", location);
app.use("/api/users", user);
app.use("/api/map", map);
app.use("/api/geographic", geographic);

app.use(
  "/api/graphql/locations",
  expressGraphQL({
    schema: location_graphql,
    graphiql: true,
  })
);

// kafka config
const kafka = require("kafka-node");
const client = new kafka.KafkaClient({ kafkaHost: "127.0.0.1:9092" });

// Kafka consumer
consumer = new kafka.Consumer(
  client,
  [
    { topic: "topic1", partition: 3 },
    { topic: "topic2", partition: 3 },
    { topic: "topic3", partition: 3 },
  ],
  {
    groupId: "group-users-1",
    autoCommit: true,
  }
);
consumer.on("message", async function (pyload) {
  // add location in mongoDB
  console.log(pyload);
  const data = JSON.parse(pyload.value);
  await Location.create({
    vehicle_id: data.vehicle_id,
    latitude: data.latitude,
    longitude: data.longitude,
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
    created_at: new Date(),
  })
    .then((res) => {
      console.log("data inserted");
    })
    .catch((error) => {
      console.error("Failed to create a new record : ", error);
    });
});

// Socket Connect
global.sockets = [];
io.on("connection", async (socket) => {
  console.log(`new connection socket - id: ${socket.id}`);
  await global.sockets.push(socket.id);
  socket.on("join", (vehicleID) => {
    console.log("join vehicle id : ", vehicleID);

    // Trigger after insert
    Location.watch().on("change", async (info) => {
      if (await global.sockets.includes(socket.id)) {
        if (info.operationType == "insert") {
          await socket.emit(
            "vehicle_location_" + vehicleID,
            JSON.stringify({
              vehicle_id: info.fullDocument.vehicle_id,
              latitude: info.fullDocument.latitude,
              longitude: info.fullDocument.longitude,
              created_at: info.fullDocument.created_at,
            })
          );
        }
      }
    });
    /* 
    setInterval(() => {
      if (global.sockets.includes(socket.id)) {
        console.log("send location to : location_" + idClient);
        socket.emit("location_" + idClient, "data x,y");
        console.log(global.sockets);
      }
    }, 3000); 
    */
  });

  // Socket disconnect
  socket.on("disconnecting", () => {
    console.log("disconnecting...");
    var index = global.sockets.indexOf(socket.id);
    if (index !== -1) {
      global.sockets.splice(index, 1);
      console.log("client " + socket.id + " is disconnected");
    }
  });
});

server.listen(3000, () => console.log("Server started at port : 3000"));

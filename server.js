require("./config/mongodb.js");
require("./config/mysql.js");
const express = require("express");
const expressGraphQL = require("express-graphql").graphqlHTTP;

const bodyParser = require("body-parser");
const cors = require("cors");
const location = require("./modules/location");
const location_graphql = require("./modules/location_graphql"); // GraphQL
const user = require("./modules/user");
var { Location } = require("./models/location");
const map = require("./modules/map");

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, { cors: { origin: "*" } });
app.use(bodyParser.json());

// Allow cross-origin
app.use(cors({ origin: "http://localhost:4200" }));
app.use(cors());

// routes
app.use("/api/locations", location);
app.use("/api/users", user);
app.use("/api/map", map);

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

/* 
// const offset = new kafka.Offset(client);

var topicsToCreate = [{
    topic: 'topic1',
    partitions: 3,
    replicationFactor: 3
},
{
    topic: 'topic2',
    partitions: 3,
    replicationFactor: 3
}];
  
client.createTopics(topicsToCreate, (error, result) => {
    console.log("done", result)
// result is an array of any errors if a given topic could not be created
});

offset.fetchLatestOffsets(["topic1"], async function (error, offsets) {
    offset.fetchLatestOffsets(["topic1"], async function (error, offsets) {
        if (error) console.log(error);
        let offsetA = JSON.stringify(offsets["topic1"])
        let offsetB = JSON.stringify(offsets["topic1"][1])
        let offsetC = JSON.stringify(offsets["topic1"][2])
        console.log("offsetC", offsetC)
        console.log("offsetB", offsetB)
        console.log("offsetA", offsetA)
        var consumer = new kafka.Consumer(
            client,
            [
                {
                    topic: "topic1",
                    partition: 3,
                    offset: 8, // retourner à partir de offsetA qui est avant le derniere (offsetA c'est toujours derniere offset) 
                }
            ], {
                autoCommit: true, // pour fetch les entrées (librer les données qui sont stockée dans queue ou la RAM)
                fromOffset: true, // fetchMaxWaitMs: 1000, // fetchMaxBytes: 1024 * 1024,
                groupId: 'group-user-1',
            }
        );
        consumer.on('message', async function (message) {
            //console.log('offset Value:: '+offsetA);
            console.log("Message from last offset:: " + JSON.stringify(message)); // will return the latest message.
            //consumer.close();
            // add location in mongoDB
            console.log(message.value)
            const data = JSON.parse(message.value)
            // Location.create({
            //     x:          data.x,
            //     y:          data.y,
            //     createdAt:   new Date()
            // }).then(res => {
            //     console.log("data inserted")
            // }).catch((error) => {
            //     console.error('Failed to create a new record : ', error);
            // });   
        });
    });
});
*/

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
    x: data.x,
    y: data.y,
    createdAt: new Date(),
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
  socket.on("join", (idClient) => {
    console.log("join client id : ", idClient);

    // Trigger after insert
    Location.watch().on("change", async (info) => {
      if (await global.sockets.includes(socket.id)) {
        if (info.operationType == "insert") {
          await socket.emit(
            "location_" + idClient,
            JSON.stringify({ x: info.fullDocument.x, y: info.fullDocument.y })
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

require("../config/mongodb.js");
const express = require("express");
const cors = require("cors");
const kafka = require("kafka-node");
var { Location } = require("../models/location");

const app = express();
app.use(express.json());
app.use(cors());

const client = new kafka.KafkaClient({ kafkaHost: "127.0.0.1:9092" });
const consumer = new kafka.Consumer(client, [
  { topic: "test_topic", partition: 0 },
]);
consumer.on("message", async function (pyload) {
  const data = JSON.parse(pyload.value);
  Location.create({
    x: data.x,
    y: data.y,
    createdAt: new Date(),
  })
    .then((result) => {
      console.log(result);
    })
    .catch((error) => {
      console.error("Failed to create a new record : ", error);
    });
});

console.log("consumer ...");
app.listen(process.env.PORT);

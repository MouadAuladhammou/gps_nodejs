const express = require("express");
const kafka = require("kafka-node");
const Sequelize = require("sequelize");

const app = express();
app.use(express.json());

const client = new kafka.KafkaClient({ kafkaHost: "127.0.0.1:9092" });
client.refreshMetadata(["topic1"], (err) => {
  if (err) {
    console.warn("Error refreshing kafka metadata", err);
  }
});
const producer = new kafka.Producer(client);

let [latitude, longitude] = [35.586012116094935, -5.3622930558240585];
setInterval(() => {
  const payload = [
    {
      topic: "topic1",
      //messages: JSON.stringify({ x: Math.floor(Math.random() * 200), y: Math.floor(Math.random() * 200) }),
      messages: JSON.stringify({
        vehicle_id: 1,
        latitude: latitude,
        longitude: longitude,
      }),
      partition: 3,
    },
  ];
  console.log(payload);

  producer.send(payload, function (error, result) {
    console.log("Sending payload to Kafka");
    if (error) {
      console.log("Sending payload failed: ", error);
    }
  });
  latitude = latitude + 0.000011; // 0.000001
  longitude = longitude - 0.00014; // - 0.000040
}, 500);

console.log("producer ...");
app.listen(process.env.PORT);

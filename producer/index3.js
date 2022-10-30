const express = require('express')
const kafka = require('kafka-node')
const Sequelize  = require('sequelize')

const app = express()
app.use(express.json())

const client = new kafka.KafkaClient({kafkaHost: '127.0.0.1:9092'})
// client.refreshMetadata(["topic1"], (err) => {
//   if (err) {
//       console.warn('Error refreshing kafka metadata', err);
//   }
// });
const producer = new kafka.Producer(client)

setInterval( () => {
  const payload = [{ 
    topic: "topic3",
    messages: JSON.stringify({ x: Math.floor(Math.random() * 200), y: Math.floor(Math.random() * 200) }),
    partition: 3
  }];
  console.log(payload)
  
  producer.send(payload, function(error, result) {
    console.log("Sending payload to Kafka");    
    if (error) {      
      console.log( "Sending payload failed: ", error);    
    }
  });
}, 5000) 

console.log("producer ...")
app.listen(process.env.PORT)


const amqp = require("amqplib");
const rabbitMQUrl = "amqp://localhost"; // URL RabbitMQ
const queueName = "gpsDataQueue"; // nom de la file d'attente (Queue) RabbitMQ

// Créer une connexion à RabbitMQ
const connectToRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();
    // NB: Echange (Exchange) utilisé ici est "AMQP default" avec type "direct".
    //   Lorsqu'un message est publié à un échange de type "direct", il est routé vers les files d'attente (Queues) dont la clé de liaison correspond exactement à la clé de routage du message. Cela signifie qu'un message sera reçu uniquement par les files d'attente qui ont été explicitement liées à l'échange avec la même clé de liaison.
    //   Il est important de noter que "AMQP defaut" est un échange par default de RabbitMQ qui son type est "direct", et que lorsqu'une file d'attente (Queue) est créée sans spécifier explicitement l'échange auquel elle est liée, elle sera automatiquement liée à cet échange par défaut.

    // Créer la file d'attente si elle n'existe pas déjà
    // NB: la création de la file d'attente ici est effectuée avec la configuration { durable: true }, ce qui signifie que la file d'attente sera durable et survivra à un redémarrage du serveur RabbitMQ.
    await channel.assertQueue(queueName, { durable: true });
    console.log("RabbitMQ connection succeeded.");
    return channel;
  } catch (error) {
    console.error("Error connecting to RabbitMQ:", error);
    process.exit(1); // Quitter l'application en cas d'erreur
  }
};

const rabbitMQChannel = connectToRabbitMQ();
module.exports = rabbitMQChannel;

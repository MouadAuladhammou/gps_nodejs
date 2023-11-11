const Redis = require("redis");
// Remarque importante: si tu tapes cette commande : root@ubuntu-20:~# redis-server
//    et tu vois ensuite ce message (sans logo de Redis): 878733:M 28 May 2023 20:23:24.288 # Could not create server TCP listening socket *:6379: bind: Address already in use
//    c'est pas probleme, tu dois juste t'assurer que le serveur Redis est en cours d'exécution => active (running) avec cette commande : root@ubuntu-20:~# systemctl status redis

const createRedisClient = async () => {
  try {
    const redisClient = Redis.createClient({
      url: "redis://10.114.0.2:6379", // On peut utiliser ip privé VPC ici si on a un load balancing entre plusieurs serveurs
      return_buffers: true,
    });
    redisClient.on("error", (err) => console.log("Redis Client Error", err));
    await redisClient.connect();
    // await redisClient.auth({ password: "admin" });

    console.log("Redis connection succeeded.");
    return redisClient;
  } catch (error) {
    console.error("Error connecting to Redis:", error);
    process.exit(1); // Quitter l'application en cas d'erreur
  }
};

const redisClientPromise = createRedisClient();

module.exports = redisClientPromise;

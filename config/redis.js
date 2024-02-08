const Redis = require("redis");
// Remarque importante: si tu tapes cette commande : root@ubuntu-20:~# redis-server
//    et tu vois ensuite ce message (sans logo de Redis): 878733:M 28 May 2023 20:23:24.288 # Could not create server TCP listening socket *:6379: bind: Address already in use
//    c'est pas probleme, tu dois juste t'assurer que le serveur Redis est en cours d'exécution => active (running) avec cette commande : root@ubuntu-20:~# systemctl status redis

const createRedisClient = async (database = 0) => {
  try {
    if (process.env.NODE_ENV === "test") return;
    const redisClient = Redis.createClient({
      url: "redis://localhost:6379", // On peut utiliser ip privé VPC ici si on a un load balancing entre plusieurs serveurs
      return_buffers: true,
    });
    redisClient.on("error", (err) => console.log("Redis Client Error", err));
    await redisClient.connect();
    // await redisClient.auth({ password: "admin" });

    await redisClient.select(database);
    // Socket & Channel => 0 (Par defaut)
    // Historical Data & Search => 2
    // Local Values (y compris les notifications) => 3
    // latest GPS data values (Key: latestDataFromGPSClients) => 4
    // Clients GPS Connected => 5
    // refresh Tokens => 6

    console.log(`Redis connection was successful with database ${database}`);
    return redisClient;
  } catch (error) {
    console.error("Error connecting to Redis:", error);
    process.exit(1); // Quitter l'application en cas d'erreur
  }
};

module.exports = createRedisClient;

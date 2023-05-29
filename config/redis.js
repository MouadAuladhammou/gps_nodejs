const Redis = require("redis");
// Remarque importante: si tu tapes cette commande : root@ubuntu-20:~# redis-server
//    et tu vois ensuite ce message (sans logo de Redis): 878733:M 28 May 2023 20:23:24.288 # Could not create server TCP listening socket *:6379: bind: Address already in use
//    c'est pas probleme, tu dois juste t'assurer que le serveur Redis est en cours d'exécution => active (running) avec cette commande : root@ubuntu-20:~# systemctl status redis

const createRedisClient = async () => {
  const redisClient = Redis.createClient();
  redisClient.on("error", (err) => console.log("Redis Client Error", err));
  await redisClient.connect();
  console.log("Redis connection succeeded.");
  return redisClient;
};

const redisClientPromise = createRedisClient();

module.exports = redisClientPromise;

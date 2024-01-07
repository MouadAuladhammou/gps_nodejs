const {
  deleteClientGpsRecord,
  deleteAllTokensFromRedis,
} = require("../utils/functions");
const { CronJob } = require("cron");

const clearCache = async () => {
  try {
    deleteClientGpsRecord();
    deleteAllTokensFromRedis();
    console.log("Cache Redis vidé avec succès.");
  } catch (err) {
    console.error("Erreur lors de la suppression du cache Redis: ", err);
  }
};

// const cronExpression = "0 23 * * 0"; // Configuration de la tâche cron pour chaque dimanche à 23h
const cronExpression = "*/10 * * * * *"; // Configuration job toutes les 10 secondes
const job = new CronJob(cronExpression, clearCache, null, true, "UTC");
console.log("Job de vidage du cache programmé pour chaque dimanche à 23h");

// Laissez le processus s'exécuter indéfiniment (ou jusqu'à ce que vous le stoppiez)
process.on("SIGINT", () => {
  console.log("Arrêt du job de vidage du cache.");
  process.exit();
});

// NB: Utiliser CMD pour lancer le script en entrant la commande suivante: node tasks/cache-clear-job.js

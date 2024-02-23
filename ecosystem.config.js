module.exports = {
  apps: [
    {
      name: "Restart MongoDB",
      script: "./restart_mongodb.sh",
      exec_interpreter: "bash", // Interpréteur de commandes
      autorestart: false, // Ne pas redémarrer automatiquement
    },
    {
      name: "NodeJS BackEnd ",
      script: "./server.js",
      instances: "max", // Utiliser autant d'instances que de cœurs disponibles
      exec_mode: "cluster", // Mode cluster pour utiliser plusieurs threads
    },
  ],
};

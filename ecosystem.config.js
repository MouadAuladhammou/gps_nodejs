module.exports = {
  apps: [
    {
      name: "NodeJS BackEnd ",
      script: "./server.js",
      instances: "max", // Utiliser autant d'instances que de cœurs disponibles
      exec_mode: "cluster", // Mode cluster pour utiliser plusieurs threads
    },
  ],
};

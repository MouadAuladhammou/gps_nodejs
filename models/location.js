const mongoose = require("mongoose");
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLInt,
} = require("graphql");

// Utiliser une Map pour stocker les modèles créés
const modelsMap = new Map();

// model API REST
const createLocationModel = (userId) => {
  const collectionName = `user_${userId}__locations`;

  // Vérifier si le modèle a déjà été créé pour cette collection
  if (modelsMap.has(collectionName)) {
    return modelsMap.get(collectionName);
  }

  const LocationSchema = mongoose.Schema({
    imei: { type: Number, required: true },
    gps: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      altitude: { type: Number },
      angle: { type: Number },
      satellites: { type: Number },
      speed: { type: Number },
    },
    ioElements: { type: Object, required: true },
    timestamp: { type: Date, required: true },
    hour: { type: Number, required: true },
    minute: { type: Number, required: true },
    notifications: { type: Object, required: false },
    created_at: { type: Date },
  });

  // Créer un index composite sur "timestamp" et "imei"
  LocationSchema.index({ timestamp: 1, imei: 1 }, { unique: true });
  const Location = mongoose.model(collectionName, LocationSchema);

  // Stocker le modèle créé dans la Map pour les utilisations futures
  modelsMap.set(collectionName, Location);

  return Location;
};

// model API GraphQL
const LocationGraphQL = new GraphQLObjectType({
  name: "Location",
  fields: () => ({
    _id: { type: GraphQLID },
    vehicle_id: { type: GraphQLID },
    latitude: { type: GraphQLString },
    longitude: { type: GraphQLString },
    hour: { type: GraphQLInt },
    minute: { type: GraphQLInt },
    created_at: { type: GraphQLString },
  }),
});

module.exports = {
  createLocationModel,
  LocationGraphQL,
};

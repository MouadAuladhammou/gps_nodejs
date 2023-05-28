const mongoose = require("mongoose");
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLInt,
} = require("graphql");

// model API REST
const Location = mongoose.model("locations", {
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
  created_at: { type: Date },
});

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
  Location,
  LocationGraphQL,
};

const mongoose = require("mongoose");
const { GraphQLObjectType, GraphQLString, GraphQLID } = require("graphql");

// model API REST
const Location = mongoose.model("Location", {
  vehicle_id: { type: Number, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
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
    created_at: { type: GraphQLString },
  }),
});

module.exports = {
  Location,
  LocationGraphQL,
};

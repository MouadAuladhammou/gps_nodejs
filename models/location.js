const mongoose = require("mongoose");
const { GraphQLObjectType, GraphQLString, GraphQLID } = require("graphql");

// model API REST
const Location = mongoose.model("Location", {
  x: { type: String },
  y: { type: String },
  createdAt: { type: Date },
});

// model API GraphQL
const Location_ = new GraphQLObjectType({
  name: "Location",
  fields: () => ({
    _id: { type: GraphQLID },
    x: { type: GraphQLString },
    y: { type: GraphQLString },
    createdAt: { type: GraphQLString },
  }),
});

module.exports = {
  Location,
  Location_,
};

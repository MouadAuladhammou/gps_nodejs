const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLSchema,
} = require("graphql");
var { Location, LocationGraphQL } = require("../models/location");

async function getDataLocation(id) {
  return await Location.findOne({ _id: id });
}

async function getDataLocations() {
  return await Location.find({});
}

// Query
const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    location: {
      type: LocationGraphQL,
      args: {
        id: { type: GraphQLString },
      },
      resolve: async (parentValue, args) => {
        return await getDataLocation(args.id);
      },
    },
    locations: {
      type: new GraphQLList(LocationGraphQL),
      resolve: async () => {
        return await getDataLocations();
      },
    },
  },
});

module.exports = new GraphQLSchema({
  query: RootQuery,
});

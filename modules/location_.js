const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLSchema,
} = require("graphql");
var { Location_ } = require("../models/location");
var { Location } = require("../models/location");

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
      type: Location_,
      args: {
        id: { type: GraphQLString },
      },
      resolve: async (parentValue, args) => {
        return await getDataLocation(args.id);
      },
    },
    locations: {
      type: new GraphQLList(Location_),
      resolve: async () => {
        return await getDataLocations();
      },
    },
  },
});

module.exports = new GraphQLSchema({
  query: RootQuery,
});

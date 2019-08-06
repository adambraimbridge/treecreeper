const logger = require('@financial-times/n-logger').default;
const partialRight = require('lodash/partialRight');
const { neo4jgraphql, makeAugmentedSchema } = require('neo4j-graphql-js');
const {
	getTypes,
	getEnums,
	getGraphqlDefs,
} = require('@financial-times/biz-ops-schema');
const { parse } = require('graphql');

const mapToNeo4j = partialRight(neo4jgraphql, process.env.DEBUG || false);

const getResolvers = () => {
	const enumResolvers = getEnums();

	const queryResolvers = getTypes().reduce(
		(query, type) =>
			Object.assign(query, {
				[type.name]: mapToNeo4j,
				[type.pluralName]: mapToNeo4j,
			}),
		{},
	);

	return {
		enumResolvers,
		queryResolvers,
		all: Object.assign({}, enumResolvers, { Query: queryResolvers }),
	};
};

const createSchema = () => {
	const typeDefs = getGraphqlDefs();
	// this should throw meaningfully if the defs are invalid;
	parse(typeDefs.join('\n'));

	typeDefs.unshift(`
directive @deprecated(
  reason: String = "No longer supported"
) on FIELD_DEFINITION | ENUM_VALUE | ARGUMENT_DEFINITION`);

	const schema = makeAugmentedSchema({
		typeDefs: typeDefs.join('\n'),
		logger: {
			log(message) {
				logger.error(`GraphQL Schema: ${message}`, {
					event: 'GRAPHQL_SCHEMA_ERROR',
				});
			},
		},
		config: { query: true, mutation: false, debug: true },
	});
	return schema;
};

module.exports = { getResolvers, createSchema };
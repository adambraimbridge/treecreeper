const logger = require('@financial-times/n-logger').default;
const { makeAugmentedSchema } = require('neo4j-graphql-js');
const { applyMiddleware } = require('graphql-middleware');
const { parse } = require('graphql');
const { getGraphqlDefs, getTypes } = require('@financial-times/tc-schema-sdk');
const { middleware: requestTracer } = require('./request-tracer');
const {merge} = require('lodash');

const resolveDocumentProperty = async ({ code }, args, context, info) => {
	if (!code) {
		throw new Error(
			'Must include code in body of query that requests any Document properties',
		);
	}
	const key = `${info.parentType.name}/${code}`;
	const record = await context.documentStoreDataLoader.load(key);
	return record[info.fieldName];
};

const getDocumentResolvers = () => {
	const typeResolvers = {};
	const types = getTypes();
	types.forEach(type => {
		const nodeProperties = type.properties;
		const documentResolvers = {};
		Object.keys(nodeProperties).forEach(prop => {
			if (nodeProperties[prop].type === 'Document') {
				documentResolvers[prop] = resolveDocumentProperty;
			}
		});
		if (Object.keys(documentResolvers).length) {
			typeResolvers[type.name] = documentResolvers;
		}
	});
	return typeResolvers;
};

const getAugmentedSchema = ({
	documentStore,
	typeDefs: extendedTypeDefs,
	resolvers: extendedResolvers,
	excludeTypes,
}) => {
	const resolvers = documentStore ? getDocumentResolvers() : {};
	const typeDefs = getGraphqlDefs();

	if (extendedTypeDefs.length) {
		typeDefs.push(...extendedTypeDefs);
	}
	if (Object.keys(extendedResolvers).length) {
		// add custom resolvers
		merge(resolvers, { ...extendedResolvers });
	}

	// this should throw meaningfully if the defs are invalid;
	parse(typeDefs.join('\n'));

	const schema = makeAugmentedSchema({
		typeDefs: typeDefs.join('\n'),
		logger: {
			log(message) {
				logger.error(`GraphQL Schema: ${message}`, {
					event: 'GRAPHQL_SCHEMA_ERROR',
				});
			},
		},
		resolvers,
		config: {
			query: excludeTypes ? { exclude: excludeTypes } : true,
			mutation: false,
			debug: true,
		},
	});

	return applyMiddleware(schema, requestTracer);
};

module.exports = {
	getAugmentedSchema,
};

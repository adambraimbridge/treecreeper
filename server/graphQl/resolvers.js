'use strict';

const util = require('util');
const partialRight = require('lodash/partialRight');
const { neo4jgraphql } = require('neo4j-graphql-js');

const mapToNeo4j = partialRight(neo4jgraphql, process.env.DEBUG || true);

const queries = [
	'System',
	'Systems',
	'Person',
	'People',
	'Repository',
	'Repositories',
	'Team',
	'Teams',
	'Group',
	'Groups',
	'HealthCheck',
	'HealthChecks',
	'CostCentre',
];

const upperCaseResolver = keys =>
	keys.reduce((resolver, key) => Object.assign(resolver, { [key.toUpperCase()]: key }), {});

const enumResolvers = {
    CircleCiVersion: {
        ONE: '1.0',
        TWO: '2.0',
        NONE: '',
    },
    Status: upperCaseResolver(['Active']),
    YesNo: upperCaseResolver(['Yes', 'No', 'Unknown']),
    LifeCycleStage: upperCaseResolver([
        'Production',
        'Requirements',
        'Retired',
        'Testing',
        'Analysis',
    ]),
    ServiceTier: upperCaseResolver(['Bronze', 'Gold', 'Silver', 'Platinum']),
};

const queryResolvers = queries.reduce(
	(query, key) => Object.assign(query, { [key]: mapToNeo4j }),
	{}
);



const mutationResolvers = {
	/*
		Example mutation of a systems scalar properties
		At the time of writing this must be done programatically rather than via
		neo4j-graphql-js
	*/
	System: async (_, { id, params } }, context) => {
		const result = await context.driver.run(`
			MATCH (s:System {id: "${id}"})
			SET s += {${util.inspect(params)}}
			RETURN s
		`);
		return result.records[0].get(0).properties;
	},
};

module.exports = {
	enumResolvers,
	queryResolvers,
	mutationResolvers,
	all: Object.assign({}, enumResolvers, {Query: queryResolvers}, {Mutation: mutationResolvers})
};

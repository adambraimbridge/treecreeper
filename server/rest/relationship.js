const { stripIndents } = require('common-tags');
const logger = require('@financial-times/n-logger').default;
const { session: db } = require('../db-connection');
const {
	dbErrorHandlers,
	queryResultHandlers,
	preflightChecks
} = require('./errors');
const { logRelationshipChanges: logChanges } = require('./kinesis');
const { sanitizeRelationship: sanitizeInput } = require('./sanitize-input');
const {
	constructRelationship: constructOutput
} = require('./construct-output');

const create = async input => {
	const sanitizedInput = sanitizeInput(input, 'CREATE');

	const {
		requestId,
		nodeType,
		code,
		attributes,
		relatedType,
		relatedCode,
		relationshipType
	} = sanitizedInput;

	await Promise.all([
		preflightChecks.bailOnDeletedNode({ nodeType, code }),
		preflightChecks.bailOnDeletedNode({
			nodeType: relatedType,
			code: relatedCode
		})
	]);

	await preflightChecks.bailOnDuplicateRelationship(sanitizedInput);

	try {
		const query = stripIndents`
			OPTIONAL MATCH (node:${nodeType} { code: $code }), (relatedNode:${relatedType} { code: $relatedCode })
			MERGE (node)-[relationship:${relationshipType}]->(relatedNode)
			ON CREATE SET relationship.createdByRequest = $requestId, relationship += $attributes
			RETURN relationship`;

		logger.info(
			Object.assign(
				{
					event: 'CREATE_RELATIONSHIP_QUERY',
					query
				},
				input
			)
		);

		const result = await db.run(query, {
			attributes,
			requestId,
			code,
			relatedCode
		});
		logChanges(requestId, result, sanitizedInput);
		return constructOutput(result);
	} catch (err) {
		dbErrorHandlers.missingRelationshipNode(err, sanitizedInput);
		throw err;
	}
};

const read = async input => {
	const {
		requestId,
		nodeType,
		code,
		relatedType,
		relatedCode,
		relationshipType
	} = sanitizeInput(input, 'READ');
	await Promise.all([
		preflightChecks.bailOnDeletedNode({ nodeType, code }),
		preflightChecks.bailOnDeletedNode({
			nodeType: relatedType,
			code: relatedCode
		})
	]);

	const query = stripIndents`
	MATCH (node:${nodeType} { code: $code })-[relationship:${relationshipType}]->(related:${relatedType} { code: $relatedCode })
	RETURN relationship`;

	logger.info({ event: 'READ_RELATIONSHIP_QUERY', requestId, query });
	const result = await db.run(query, { code, relatedCode });
	queryResultHandlers.missingRelationship(
		Object.assign({ result, status: 404 }, input)
	);
	return constructOutput(result);
};

const update = async input => {
	const sanitizedInput = sanitizeInput(input, 'UPDATE');
	const {
		requestId,
		nodeType,
		code,
		attributes,
		deletedAttributes,
		relatedType,
		relatedCode,
		relationshipType
	} = sanitizedInput;

	await Promise.all([
		preflightChecks.bailOnDeletedNode({ nodeType, code }),
		preflightChecks.bailOnDeletedNode({
			nodeType: relatedType,
			code: relatedCode
		})
	]);

	try {
		const queryParts = [
			// OPTIONAL MATCH needed in order to throw error which will help us
			// identify which, if any, node is missing
			stripIndents`OPTIONAL MATCH (node:${nodeType} { code: $code }), (relatedNode:${relatedType} { code: $relatedCode })
			MERGE (node)-[relationship:${relationshipType}]->(relatedNode)
			ON CREATE SET relationship.createdByRequest = $requestId, relationship += $attributes
			ON MATCH SET relationship += $attributes`
		];
		if (deletedAttributes.length) {
			queryParts.push(
				...deletedAttributes.map(attr => `REMOVE relationship.${attr}`)
			);
			queryParts.push('WITH relationship');
		}
		queryParts.push('RETURN relationship');

		const query = queryParts.join('\n');
		logger.info(
			Object.assign(
				{
					event: 'UPDATE_RELATIONSHIP_QUERY',
					query
				},
				input
			)
		);

		const result = await db.run(query, {
			attributes,
			requestId,
			code,
			relatedCode
		});

		logChanges(requestId, result, sanitizedInput);

		return {
			data: constructOutput(result),
			status:
				result.records[0].get('relationship').properties.createdByRequest ===
				requestId
					? 201
					: 200
		};
	} catch (err) {
		dbErrorHandlers.missingRelationshipNode(err, sanitizedInput);
		throw err;
	}
};

const remove = async input => {
	const sanitizedInput = sanitizeInput(input, 'DELETE');
	const {
		requestId,
		nodeType,
		code,
		relatedType,
		relatedCode,
		relationshipType
	} = sanitizedInput;

	// this will error with a 404 if the node does not exist
	// note - this calls bailOnDeletedNode, which is why it isn't done explicitly
	// in this function
	await read(input);

	const query = stripIndents`
	MATCH (node:${nodeType} { code: $code })-[relationship:${relationshipType}]->(related:${relatedType} { code: $relatedCode })
	DELETE relationship`;

	logger.info({ event: 'REMOVE_RELATIONSHIP_QUERY', requestId, query });
	const result = await db.run(query, { code, relatedCode });
	logChanges(requestId, result, sanitizedInput);
	return { status: 204 };
};

module.exports = {
	create,
	read,
	update,
	delete: remove
};
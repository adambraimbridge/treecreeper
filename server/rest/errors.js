const { stripIndents } = require('common-tags');
const httpErrors = require('http-errors');
const { session: db } = require('../db-connection');

const ERROR_RX = Object.freeze({
	nodeExists: /already exists with label/,
	nodeAttached: /Cannot delete node<\d+>, because it still has relationships/,
	missingRelated: /Expected to find a node at related(\d+) but found nothing/,
	missingRelationshipEndpoint: /Expected to find a node at ([a-zA-Z]+) but found nothing/
});

const handleMissingRelationshipNode = (
	err,
	{ nodeType, code, relatedCode, relatedType }
) => {
	const missingProperty = (ERROR_RX.missingRelationshipEndpoint.exec(
		err.message
	) || [])[1];

	if (missingProperty === 'node') {
		throw httpErrors(
			400,
			`Cannot create relationship: start node ${nodeType} ${code} does not exist.`
		);
	} else if (missingProperty === 'relatedNode') {
		throw httpErrors(
			400,
			`Cannot create relationship: start node ${relatedType} ${relatedCode} does not exist.`
		);
	}
};

const handleUpsertError = (err, relationships) => {
	const missingRelatedIndex = (ERROR_RX.missingRelated.exec(err.message) ||
		[])[1];
	if (missingRelatedIndex) {
		const missing = relationships[missingRelatedIndex];
		throw httpErrors(
			400,
			stripIndents`Missing related node ${missing.nodeType} ${missing.nodeCode}.
			If you need to create multiple things which depend on each other,
			use the \`upsert=true\` query string to create placeholder entries for
			related things which can be populated with attributes with subsequent
			API calls.
			DO NOT use \`upsert\` if you are attempting to create a relationship with
			an item that already exists - there's probably a mistake somewhere in your
			code`
		);
	}
};

const handleDuplicateNodeError = (err, nodeType, code) => {
	if (ERROR_RX.nodeExists.test(err.message)) {
		throw httpErrors(409, `${nodeType} ${code} already exists`);
	}
};

const handleDuplicateRelationship = async ({
	relationshipType,
	nodeType,
	code,
	relatedType,
	relatedCode
}) => {
	const existingRelationship = await db.run(
		`
			MATCH (node:${nodeType} { code: $code })-[relationship:${relationshipType}]->(relatedNode:${relatedType} { code: $relatedCode })
			RETURN relationship
		`,
		{ code, relatedCode }
	);

	if (existingRelationship.records.length) {
		throw httpErrors(
			409,
			`relationship ${relationshipType} from ${nodeType} ${code} to ${relatedType} ${relatedCode} already exists`
		);
	}
};

const handleMissingNode = ({ result, nodeType, code, status }) => {
	if (!result.records.length) {
		throw httpErrors(status, `${nodeType} ${code} does not exist`);
	}
};

const handleMissingRelationship = ({
	result,
	nodeType,
	code,
	relationship,
	relatedType,
	relatedCode,
	status
}) => {
	if (!result.records.length) {
		throw httpErrors(
			status,
			`Relationship ${relationship} from ${nodeType} ${code} to ${relatedType} ${relatedCode} does not exist`
		);
	}
};

const handleAttachedNode = ({ record, nodeType, code }) => {
	if (Object.keys(record.relationships).length) {
		throw httpErrors(
			409,
			`Cannot delete - ${nodeType} ${code} has relationships`,
			{ relationships: record.relationships }
		);
	}
};

const handleDeletedNode = async ({ nodeType, code, status = 410 }) => {
	const checkNode = await db.run(
		stripIndents`
	MATCH (node:${nodeType} { code: $code, isDeleted: true})
	RETURN node`,
		{ code }
	);

	if (!checkNode.records[0]) {
		return;
	}
	if (status === 410) {
		throw httpErrors(410, `${nodeType} ${code} has been deleted`);
	} else if (status === 409) {
		throw httpErrors(
			409,
			`${nodeType} ${code} has been deleted, but it's code is still reserved. Choose another code name.`
		);
	}
};

const handleRelationshipActionError = relationshipAction => {
	if (
		!relationshipAction ||
		!['append', 'replace'].includes(relationshipAction)
	) {
		throw httpErrors(
			400,
			'PATCHing relationships requires a relationshipAction query param set to `append` or `replace`'
		);
	}
};

module.exports = {
	preflightChecks: {
		bailOnDeletedNode: handleDeletedNode,
		bailOnDuplicateRelationship: handleDuplicateRelationship,
		bailOnMissingRelationshipAction: handleRelationshipActionError
	},
	queryResultHandlers: {
		missingNode: handleMissingNode,
		attachedNode: handleAttachedNode,
		missingRelationship: handleMissingRelationship
	},
	dbErrorHandlers: {
		nodeUpsert: handleUpsertError,
		duplicateNode: handleDuplicateNodeError,
		missingRelationshipNode: handleMissingRelationshipNode
	}
};
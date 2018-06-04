const logger = require('@financial-times/n-logger').default;
const EventLogWriter = require('../lib/event-log-writer');
const Kinesis = require('../lib/kinesis');
const { isSameNeo4jInteger } = require('./utils');

const kinesisClient = new Kinesis(
	process.env.CRUD_EVENT_LOG_STREAM_NAME || 'test-stream-name'
);
const eventLogWriter = new EventLogWriter(kinesisClient);

const sendEvent = event =>
	eventLogWriter.sendEvent(event).catch(error => {
		logger.error(
			'Failed to send event to event log',
			Object.assign({ event, error: error })
		);
	});

const createRelationshipInfoFromNeo4jData = ({ rel, destination, origin }) => {
	const isIncoming = !isSameNeo4jInteger(rel.start, origin.identity);
	return {
		relType: rel.type,
		direction: isIncoming ? 'incoming' : 'outgoing',
		nodeCode: destination.properties.code,
		nodeType: destination.labels[0]
	};
};

const sendNodeRelationshipEvent = ({
	verb,
	rel,
	destination,
	origin,
	requestId
}) => {
	return sendEvent(
		Object.assign(
			{
				code: origin.properties.code,
				type: origin.labels[0]
			},
			{
				event: `${verb}_RELATIONSHIP`,
				action: EventLogWriter.actions.UPDATE,
				relationship: createRelationshipInfoFromNeo4jData({
					rel,
					destination,
					origin
				}),
				requestId
			}
		)
	);
};

const logNodeChanges = (requestId, result, deletedRelationships) => {
	const node = result.records[0].get('node');
	let event;
	let action;

	if (node.properties.deletedByRequest === requestId) {
		event = 'DELETED_NODE';
		action = EventLogWriter.actions.DELETE;
	} else if (node.properties.createdByRequest === requestId) {
		event = 'CREATED_NODE';
		action = EventLogWriter.actions.CREATE;
	} else {
		event = 'UPDATED_NODE';
		action = EventLogWriter.actions.UPDATE;
	}

	sendEvent({
		event,
		action,
		code: node.properties.code,
		type: node.labels[0],
		requestId
	});

	if (
		result.records[0] &&
		result.records[0].has('related') &&
		result.records[0].get('related')
	) {
		result.records.forEach(record => {
			const target = record.get('related');
			const rel = record.get('relationship');
			console.log(target.properties.createdByRequest, requestId);
			if (target.properties.createdByRequest === requestId) {
				sendEvent({
					event: 'CREATED_NODE',
					action: EventLogWriter.actions.CREATE,
					code: target.properties.code,
					type: target.labels[0],
					requestId
				});
			}

			if (rel.properties.createdByRequest === requestId) {
				sendNodeRelationshipEvent({
					verb: 'CREATED',
					rel,
					destination: target,
					origin: node,
					requestId
				});

				sendNodeRelationshipEvent({
					verb: 'CREATED',
					rel,
					destination: node,
					origin: target,
					requestId
				});
			}
		});
	}

	if (deletedRelationships && deletedRelationships.records.length) {
		deletedRelationships.records.forEach(record => {
			const target = record.get('related');
			const rel = record.get('relationship');

			sendNodeRelationshipEvent({
				verb: 'DELETED',
				rel,
				destination: target,
				origin: node,
				requestId
			});

			sendNodeRelationshipEvent({
				verb: 'DELETED',
				rel,
				destination: node,
				origin: target,
				requestId
			});
		});
	}
};

const sendRelationshipEvents = (
	verb,
	requestId,
	{ nodeType, code, relatedType, relatedCode, relationshipType }
) => {
	sendEvent({
		event: `${verb}_RELATIONSHIP`,
		action: EventLogWriter.actions.UPDATE,
		relationship: {
			relType: relationshipType,
			direction: 'outgoing',
			nodeCode: relatedCode,
			nodeType: relatedType
		},
		code,
		type: nodeType,
		requestId
	});

	sendEvent({
		event: `${verb}_RELATIONSHIP`,
		action: EventLogWriter.actions.UPDATE,
		relationship: {
			relType: relationshipType,
			direction: 'incoming',
			nodeCode: code,
			nodeType: nodeType
		},
		code: relatedCode,
		type: relatedType,
		requestId
	});
};

const logRelationshipChanges = (requestId, result, params) => {
	if (!result.records[0]) {
		sendRelationshipEvents('DELETED', requestId, params);
	} else {
		const relationshipRecord = result.records[0].get('relationship');
		if (relationshipRecord.properties.createdByRequest === requestId) {
			sendRelationshipEvents('CREATED', requestId, params);
		} else {
			sendRelationshipEvents('UPDATED', requestId, params);
		}
	}
};

module.exports = { logNodeChanges, logRelationshipChanges };
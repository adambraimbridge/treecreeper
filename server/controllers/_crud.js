const db = require('../db-connection');

const get = async (req, res, nodeType) => {

	try {
		const query = `MATCH (a:${nodeType} {id: "${req.params.id}"}) RETURN a`;
		const result = await db.run(query);
		if (result.records.length) {
			return res.send(result.records[0]._fields[0].properties);
		}
		else {
			return res.status(404).end(`${nodeType} ${req.params.id} not found`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};

const create = async (req, res, obj, nodeType, relationships, uniqueAttrName) => {
	if (uniqueAttrName) {
		const existingNode = `MATCH (a:${nodeType} {${uniqueAttrName}: "${obj[uniqueAttrName]}"}) RETURN a`;
		const result = await db.run(existingNode);
		if (result.records.length > 0) {
			return res.status(400).end(`node with ${uniqueAttrName}=${obj[uniqueAttrName]} already exists`);
		}
	}

	const createQuery = `CREATE (a:${nodeType} $node) RETURN a`;
	try {
		const result = await db.run(createQuery, {node: obj});

		if (relationships) {
			for (let relationship of relationships) {
				const createRelationship = `
					MATCH (a:${relationship.from}),(b:${relationship.to})
					WHERE a.id = '${relationship.fromId}'
					AND b.id = '${relationship.toId}'
					CREATE (a)-[r:${relationship.name}]->(b)
					RETURN r
				`;

				try {
					// TODO use single transaction
					// fail both if either fails
					const resultRel = await db.run(createRelationship, obj);

					console.log(`created relationship ${relationship.from} -> ${relationship.to}`, resultRel.records[0]?resultRel.records[0]._fields[0].type: 'NoPE');
				}
				catch (e) {
					console.log('relationships not created', e.toString());
					return res.status(400).end(e.toString());
				}
			}

			// TODO check node created, check REL created, more explicit message
			return res.status(200).end('Relationships created');
		}
		res.send(result.records[0]._fields[0].properties);
	}
	catch (e) {
		console.log(`${nodeType} not created`, e.toString());
		return res.status(400).end(e.toString());
	}
};

const update = async (req, res, obj, nodeType) => {
	try {
		const query = `
			MATCH (a:${nodeType} {id: "${obj.id}"})
			SET a += $props
			RETURN a
		`;
		const result = await db.run(query, {props: obj});

		const propAmount = result.summary && result.summary.updateStatistics ? result.summary.updateStatistics.propertiesSet() : 0;

		if (result.records.length && propAmount > 0) {
			return res.send(result.records[0]._fields[0].properties);
		}
		else if (!propAmount) {
			return res.status(400).end('No properties were updated with', obj);
		}
		else {
			return res.status(404).end(`${nodeType}${obj.id} not found. No nodes updated.`);
		}

		res.send(result);
	}
	catch (e) {
		console.log('error', e);
		return res.status(500).end(e.toString());
	}
};

const remove = async (req, res, nodeType, detach) => {

	try {
		const result = await db.run(`MATCH (a:${nodeType} {id: "${req.params.id}"})${detach ? ' DETACH' : ''} DELETE a`);
		if (result && result.summary && result.summary.counters && result.summary.counters.nodesDeleted() === 1) {
			return res.status(200).end(`${req.params.id} deleted`);
		}
		else {
			return res.status(404).end(`${req.params.id} not found. No nodes deleted.`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};


const getAllforOne = async (req, res, relationship, param) => {
	try {
		const query = `MATCH p=(${relationship.from} {id: "${param}"})-[r:${relationship.name}]->(${relationship.to}) RETURN p`;
		const result = await db.run(query);

		if (result.records.length) {
			const elements = result.records.map((node) => {
				return node._fields[0].end.properties;
			});
			return res.send(elements);
		}
		else {
			return res.status(404).end(`No ${relationship.to} found for ${relationship.from} ${param}`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};


const getAll = async (req, res, nodeType, filters = '') => {

	try {
		const query = `MATCH (a:${nodeType} ${filters}) RETURN a`;
		const result = await db.run(query);

		if (result.records.length) {
			const elements = result.records.map((node) => {
				return node._fields[0].properties;
			});

			return res.send(elements);
		}
		else {
			return res.status(404).end(`No ${nodeType} found`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};

module.exports = { get, create, update, remove, getAll, getAllforOne };

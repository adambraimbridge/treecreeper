const suppliers = require('./suppliers');
const contracts = require('./contracts');

const createSuppliers = async (db) => {
	for (let supplier of suppliers) {
		await db.run('CREATE (a:Supplier {id: $_id, name: $name, address: $address, term: $term, contact: $contact}) RETURN a', supplier);
	}
};

const createContracts = async (db) => {
	for (let contract of contracts) {
		await db.run('CREATE (a:Contract {id: $id, name: $name}) RETURN a', contract);
		await db.run(`
				MATCH (a:Supplier),(b:Contract)
				WHERE a.id = '${contract.supplierId}'
				AND b.id = '${contract.id}'
				CREATE (a)-[r:SIGNS]->(b)
				RETURN r
			`);
	}
};

const createAll = (db) => {
	createSuppliers(db);
	createContracts(db);
};

module.exports = createAll;

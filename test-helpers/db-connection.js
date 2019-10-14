const neo4j = require('neo4j-driver').v1;

const driver = neo4j.driver(
	process.env.NEO4J_BOLT_URL,
	neo4j.auth.basic(
		process.env.NEO4J_BOLT_USER,
		process.env.NEO4J_BOLT_PASSWORD,
	),
	{ disableLosslessIntegers: true },
);

const spyDbQuery = ({ sinon }) => {
	const originalSession = driver.session.bind(driver);
	let spy;
	sinon.stub(driver, 'session').callsFake(() => {
		const session = originalSession();
		if (!spy) {
			sinon.spy(session, 'run');
			spy = session.run;
		} else {
			session.run = spy;
		}
		return session;
	});
	return () => spy;
};

const stubDbTransaction = ({ sinon }, properties = {}) => {
	const runStub = sinon.stub();
	const dummyId = { equals: () => false };
	runStub.resolves({
		records: [
			{
				get: () => ({
					properties,
					labels: [],
					identity: dummyId,
					start: dummyId,
					end: dummyId,
				}),
				has: () => false,
			},
		],
	});
	const stubSession = {
		run: runStub,
		writeTransaction: func => func(stubSession),
		close: () => {},
	};
	sinon.stub(driver, 'session').returns(stubSession);
	return runStub;
};

module.exports = {
	spyDbQuery,
	stubDbTransaction,
	driver,
};
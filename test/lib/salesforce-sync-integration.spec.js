const salesforceSync = require('../../server/lib/salesforce-sync');
const app = require('../../server/app.js');
const { schemaReady } = require('../../server/lib/configure-schema');

const namespace = 'salesforce-sync';
const { dropDb } = require('../helpers/test-data');
const request = require('../helpers/supertest').getNamespacedSupertest(
	namespace,
);

describe('salesforce sync integration', () => {
	beforeAll(() => schemaReady);
	beforeEach(async () => {
		dropDb(namespace);
		jest.spyOn(salesforceSync, 'setSalesforceIdForSystem');
	});

	afterEach(async () => {
		dropDb(namespace);
		salesforceSync.setSalesforceIdForSystem.mockRestore();
	});

	it('should call when POSTing System', async () => {
		await request(app)
			.post(`/v2/node/System/${namespace}-system`)
			.namespacedAuth()
			.send({
				name: 'created',
			});
		expect(salesforceSync.setSalesforceIdForSystem).toHaveBeenCalledTimes(
			1,
		);
		expect(
			salesforceSync.setSalesforceIdForSystem.mock.calls[0][0].code,
		).toBe('salesforce-sync-system');
	});

	it.skip('should call when PATCHing System', async () => {
		await request(app)
			.patch(`/v2/node/System/${namespace}-system`)
			.namespacedAuth()
			.send({
				name: 'updated',
			});
		expect(salesforceSync.setSalesforceIdForSystem).toHaveBeenCalledTimes(
			1,
		);
		expect(
			salesforceSync.setSalesforceIdForSystem.mock.calls[0][0].code,
		).toBe('salesforce-sync-system');
	});

	it('should not call when POSTing non System', async () => {
		await request(app)
			.post(`/v2/node/Team/${namespace}-system`)
			.namespacedAuth()
			.send({
				name: 'created',
			});
		expect(salesforceSync.setSalesforceIdForSystem).not.toHaveBeenCalled();
	});

	it('should not call when PATCHing non System', async () => {
		await request(app)
			.patch(`/v2/node/Team/${namespace}-system`)
			.namespacedAuth()
			.send({
				name: 'updated',
			});
		expect(salesforceSync.setSalesforceIdForSystem).not.toHaveBeenCalled();
	});
});

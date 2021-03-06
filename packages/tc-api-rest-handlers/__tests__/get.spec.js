const { setupMocks } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const { getHandler } = require('../get');

describe('rest GET', () => {
	const namespace = 'api-rest-handlers-get';
	const mainCode = `${namespace}-main`;
	const input = {
		type: 'MainType',
		code: mainCode,
	};

	const { createNodes, createNode, connectNodes, meta } = setupMocks(
		namespace,
	);

	const createMainNode = (props = {}) =>
		createNode('MainType', { code: mainCode, ...props });

	it('gets record without relationships', async () => {
		await createMainNode({
			someString: 'name1',
		});
		const { body, status } = await getHandler()(input);

		expect(status).toBe(200);
		expect(body).toMatchObject({ code: mainCode, someString: 'name1' });
	});

	it('retrieves metadata', async () => {
		await createMainNode();
		const { body, status } = await getHandler()(input);

		expect(status).toBe(200);
		expect(body).toMatchObject(meta.default);
	});

	it('retrieves array data', async () => {
		await createMainNode({
			// someStringList: ['one', 'two'],
			someMultipleChoice: ['First', 'Second'],
		});
		const { body, status } = await getHandler()(input);

		expect(status).toBe(200);
		expect(body).toMatchObject({
			// someStringList: ['one', 'two'],
			someMultipleChoice: ['First', 'Second'],
		});
	});

	it('gets record with relationships', async () => {
		const [main, child, parent] = await createNodes(
			['MainType', mainCode],
			['ChildType', `${namespace}-child`],
			['ParentType', `${namespace}-parent`],
		);
		await connectNodes(
			// tests incoming and outgoing relationships
			[main, 'HAS_CHILD', child],
			[parent, 'IS_PARENT_OF', main],
		);

		const { body, status } = await getHandler()(input);
		expect(status).toBe(200);
		expect(body).toMatchObject({
			code: mainCode,
			parents: [`${namespace}-parent`],
			children: [`${namespace}-child`],
		});
	});

	it('throws 404 error if no record', async () => {
		await expect(getHandler()(input)).rejects.httpError({
			status: 404,
			message: `MainType ${mainCode} does not exist`,
		});
	});

	it('throws if neo4j query fails', async () => {
		dbUnavailable();
		await expect(getHandler()(input)).rejects.toThrow('oh no');
	});

	describe('rich relationship information', () => {
		it('gets record with rich relationship information if richRelationships query is true', async () => {
			const [main, childOne, childTwo, parent] = await createNodes(
				['MainType', mainCode],
				['ChildType', `${namespace}-child-1`],
				['ChildType', `${namespace}-child-2`],
				['ParentType', `${namespace}-parent`],
			);
			await connectNodes(
				[main, 'HAS_CHILD', childOne],
				[main, 'HAS_CHILD', childTwo],
				[parent, 'IS_PARENT_OF', main],
			);

			const { body, status } = await getHandler()({
				query: { richRelationships: true },
				...input,
			});

			expect(status).toBe(200);
			[...body.children, ...body.parents].forEach(relationship =>
				expect(relationship).toHaveProperty(
					'code',
					'_updatedByClient',
					'_updatedByRequest',
					'_updatedTimestamp',
					'_updatedByUser',
					'_createdByClient',
					'_createdByRequest',
					'_createdTimestamp',
					'_createdByUser',
				),
			);
		});
	});
});

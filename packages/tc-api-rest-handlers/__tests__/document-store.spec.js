const { docstore } = require('@financial-times/tc-api-s3-document-store');
const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const {
	getHandler,
	deleteHandler,
	postHandler,
	patchHandler,
	absorbHandler,
} = require('..');

describe('rest document store integration', () => {
	const namespace = 'api-rest-handlers-docstore';
	const mainCode = `${namespace}-main`;
	const otherCode = `${namespace}-other`;
	const input = {
		type: 'MainType',
		code: mainCode,
	};

	const someString = 'some string';
	const someDocument = 'some document';

	const getInput = (body, query = {}) => {
		return { ...input, body, query };
	};

	const { createNode, createNodes, connectNodes } = setupMocks(namespace);

	const documentStore = docstore();
	const documentFromS3 = { someDocument: 'some document from s3' };

	const createResolvedDocstoreMock = (method, resolved) =>
		jest.spyOn(documentStore, method).mockResolvedValue(resolved);

	const createRejectedDocstoreMock = (method, rejected) =>
		jest.spyOn(documentStore, method).mockRejectedValue(rejected);

	const createMainNode = (props = {}) =>
		createNode('MainType', { code: mainCode, ...props });

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('GET', () => {
		it('gets record with Documents', async () => {
			await createMainNode();
			const mockDocstoreGet = createResolvedDocstoreMock('get', {
				body: documentFromS3,
			});

			const { body, status } = await getHandler({ documentStore })(input);

			expect(status).toBe(200);
			expect(body).toMatchObject({ code: mainCode, ...documentFromS3 });
			expect(mockDocstoreGet).toHaveBeenCalledWith('MainType', mainCode);
		});

		it('throws if s3 query fails', async () => {
			const mockDocstoreGet = createRejectedDocstoreMock(
				'get',
				new Error('oh no'),
			);
			await expect(getHandler({ documentStore })(input)).rejects.toThrow(
				'oh no',
			);
			expect(mockDocstoreGet).toHaveBeenCalledWith('MainType', mainCode);
		});

		it('returns document from neo4j when documentStore is not passed in', async () => {
			await createMainNode({ someDocument });
			const { body, status } = await getHandler({})(input);

			expect(status).toBe(200);
			expect(body).toMatchObject({ code: mainCode, someDocument });
		});
	});

	describe('DELETE', () => {
		it('deletes record with Documents', async () => {
			await createMainNode();
			const versionMarker = 'delete-marker';
			const mockDocstoreDelete = createResolvedDocstoreMock('delete', {
				versionMarker,
			});

			const { status } = await deleteHandler({ documentStore })(input);

			expect(status).toBe(204);
			await neo4jTest('MainType', mainCode).notExists();
			expect(mockDocstoreDelete).toHaveBeenCalledWith(
				'MainType',
				mainCode,
			);
		});

		it('deletes record when documentStore is not passed in', async () => {
			await createMainNode({ someDocument });

			const { status } = await deleteHandler({})(input);

			expect(status).toBe(204);
			await neo4jTest('MainType', mainCode).notExists();
		});

		it('throws if s3 query fails', async () => {
			await createMainNode();
			const mockDocstoreDelete = createRejectedDocstoreMock(
				'delete',
				new Error('oh no'),
			);
			await expect(
				deleteHandler({ documentStore })(input),
			).rejects.toThrow('oh no');
			await neo4jTest('MainType', mainCode).exists();
			expect(mockDocstoreDelete).toHaveBeenCalledWith(
				'MainType',
				mainCode,
			);
		});

		it('undoes any s3 actions if neo4j query fails', async () => {
			const versionMarker = 'delete-marker';
			await createMainNode();

			const mockUndo = jest.fn(async () => ({}));
			const mockDocstoreDelete = createResolvedDocstoreMock('delete', {
				versionMarker,
				undo: mockUndo,
			});
			dbUnavailable({ skip: 1 });
			await expect(
				deleteHandler({ documentStore })(input),
			).rejects.toThrow('oh no');
			expect(mockDocstoreDelete).toHaveBeenCalledWith(
				'MainType',
				mainCode,
			);
			expect(mockUndo).toHaveBeenCalled();
		});
	});

	[
		['POST', postHandler, 200],
		['PATCH', patchHandler, 201],
	].forEach(([method, handler, goodStatus]) => {
		describe(`${method} create`, () => {
			const versionMarker = 'post-marker';

			it('creates record with Documents', async () => {
				const mockDocstorePost = createResolvedDocstoreMock('post', {
					versionMarker,
					body: documentFromS3,
				});

				const { status, body } = await handler({ documentStore })(
					getInput({ someString, someDocument }),
				);

				expect(status).toBe(goodStatus);
				expect(body).toMatchObject({
					code: mainCode,
					someString,
					...documentFromS3,
				});

				await neo4jTest('MainType', mainCode)
					.exists()
					.match({ code: mainCode, someString });

				expect(mockDocstorePost).toHaveBeenCalledWith(
					'MainType',
					mainCode,
					{ someDocument },
				);
			});

			it("doesn't set a Document property when empty string provided", async () => {
				const mockDocstorePost = createResolvedDocstoreMock('post', {});
				const { status, body } = await handler({ documentStore })(
					getInput({ someDocument: '' }),
				);

				expect(status).toBe(goodStatus);
				expect(body).toMatchObject({
					code: mainCode,
				});
				await neo4jTest('MainType', mainCode).exists();

				expect(mockDocstorePost).not.toHaveBeenCalled();
			});

			if (method === 'POST') {
				it('undoes any s3 actions if record already exists', async () => {
					await createNode('MainType', {
						code: mainCode,
					});
					await neo4jTest('MainType', mainCode).exists();
					const mockUndo = jest.fn(async () => ({}));
					const mockDocstorePost = createResolvedDocstoreMock(
						'post',
						{
							undo: mockUndo,
						},
					);

					await expect(
						handler({ documentStore })(getInput({ someDocument })),
					).rejects.httpError({
						status: 409,
						message: `MainType ${mainCode} already exists`,
					});
					expect(mockDocstorePost).toHaveBeenCalledWith(
						'MainType',
						mainCode,
						{ someDocument },
					);
					expect(mockUndo).toHaveBeenCalled();
				});
			}

			it('throws if s3 query fails', async () => {
				const mockDocstorePost = createRejectedDocstoreMock(
					'post',
					new Error('oh no'),
				);
				await expect(
					handler({ documentStore })(getInput({ someDocument })),
				).rejects.toThrow('oh no');
				expect(mockDocstorePost).toHaveBeenCalled();
			});

			it('undoes any s3 actions if neo4j query fails', async () => {
				const mockUndo = jest.fn(async () => ({}));
				const mockDocstorePost = createResolvedDocstoreMock('post', {
					versionMarker,
					undo: mockUndo,
				});
				dbUnavailable({ skip: method === 'PATCH' ? 1 : 0 });

				await expect(
					handler({ documentStore })(getInput({ someDocument })),
				).rejects.toThrow('oh no');
				expect(mockDocstorePost).toHaveBeenCalledWith(
					'MainType',
					mainCode,
					{ someDocument },
				);
				expect(mockUndo).toHaveBeenCalled();
			});

			it('returns document from neo4j when documentStore is not passed in', async () => {
				const { status, body } = await handler({})(
					getInput({ someString, someDocument }),
				);

				expect(status).toBe(goodStatus);
				expect(body).toMatchObject({
					code: mainCode,
					someString,
					someDocument,
				});

				await neo4jTest('MainType', mainCode)
					.exists()
					.match({ code: mainCode, someString });
			});
		});
	});

	describe('PATCH update', () => {
		const versionMarker = 'patch-marker';

		it('updates record with Documents', async () => {
			await createMainNode();
			const mockDocstorePatch = createResolvedDocstoreMock('patch', {
				versionMarker,
				body: documentFromS3,
			});
			const { status, body } = await patchHandler({ documentStore })(
				getInput({ someString, someDocument }),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someString,
				...documentFromS3,
			});

			await neo4jTest('MainType', mainCode)
				.exists()
				.match({ code: mainCode, someString });

			expect(mockDocstorePatch).toHaveBeenCalledWith(
				'MainType',
				mainCode,
				{ someDocument },
			);
		});

		it('unsets a Document property when empty string provided', async () => {
			await createMainNode();
			const anotherDocFromS3 = {
				anotherDocument: 'another document from s3',
			};
			const mockDocstorePatch = createResolvedDocstoreMock('patch', {
				versionMarker,
				body: anotherDocFromS3,
			});
			const { status, body } = await patchHandler({ documentStore })(
				getInput({
					someDocument: '',
					anotherDocument: 'another document',
				}),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({ code: mainCode, ...anotherDocFromS3 });

			await neo4jTest('MainType', mainCode).exists();

			expect(mockDocstorePatch).toHaveBeenCalledWith(
				'MainType',
				mainCode,
				{
					anotherDocument: 'another document',
				},
			);
		});

		it("returns patched document store result even if neo4j won't update", async () => {
			await createMainNode();
			const documentBody = { someDocument: 'some document' };
			const mockPost = createResolvedDocstoreMock('patch', {
				body: documentBody,
			});
			const result = await patchHandler({ documentStore })(
				getInput(documentBody),
			);
			expect(result).toMatchObject({
				status: 200,
				body: documentBody,
			});
			expect(mockPost).toHaveBeenCalledWith('MainType', mainCode, {
				someDocument: 'some document',
			});
		});

		it('throws if s3 query fails', async () => {
			await createMainNode();
			const mockDocstorePatch = createRejectedDocstoreMock(
				'patch',
				new Error('oh no'),
			);
			await expect(
				patchHandler({ documentStore })(getInput({ someDocument })),
			).rejects.toThrow('oh no');
			expect(mockDocstorePatch).toHaveBeenCalled();
		});

		it('undoes any s3 actions if neo4j query fails', async () => {
			const mockUndo = jest.fn(async () => ({}));
			const mockDocstorePatch = createResolvedDocstoreMock('patch', {
				versionMarker,
				undo: mockUndo,
				body: documentFromS3,
			});
			await createMainNode();
			dbUnavailable({ skip: 1 });

			await expect(
				patchHandler({ documentStore })(
					getInput({
						someDocument: 'some document',
						someString: 'some string',
					}),
				),
			).rejects.toThrow('oh no');
			expect(mockDocstorePatch).toHaveBeenCalledWith(
				'MainType',
				mainCode,
				{ someDocument },
			);
			expect(mockUndo).toHaveBeenCalled();
		});

		it('returns document from neo4j when documentStore is not passed in', async () => {
			await createMainNode();
			const { status, body } = await patchHandler({})(
				getInput({ someString, someDocument }),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someString,
				someDocument,
			});

			await neo4jTest('MainType', mainCode)
				.exists()
				.match({ code: mainCode, someString });
		});
	});

	describe('absorb', () => {
		it('responds with 500 if s3 query fails', async () => {
			await createNodes(['MainType', mainCode], ['MainType', otherCode]);
			const mockDocstoreAbsorb = createRejectedDocstoreMock(
				'absorb',
				new Error('oh no'),
			);
			await expect(
				absorbHandler({ documentStore })({
					...input,
					codeToAbsorb: otherCode,
				}),
			).rejects.toThrow('oh no');
			expect(mockDocstoreAbsorb).toHaveBeenCalled();
			await neo4jTest('MainType', otherCode).exists();
		});

		it('merges document properties', async () => {
			await createNodes(
				[
					'MainType',
					{
						code: mainCode,
						someString: 'Fake Document',
						anotherDocument: 'Another Fake Document',
					},
				],
				[
					'MainType',
					{
						code: otherCode,
						anotherDocument: 'A Third Fake Document',
					},
				],
			);
			const mockDocstoreAbsorb = createResolvedDocstoreMock('absorb', {
				body: {
					anotherDocument: 'A Third Fake Document',
				},
			});

			const { status, body } = await absorbHandler({ documentStore })({
				...input,
				codeToAbsorb: otherCode,
			});
			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someString: 'Fake Document',
				anotherDocument: 'A Third Fake Document',
			});
			expect(mockDocstoreAbsorb).toHaveBeenCalledWith(
				'MainType',
				otherCode,
				mainCode,
			);
			await neo4jTest('MainType', otherCode).notExists();
		});

		it('merges neo4j document properties when documentStore is not passed in', async () => {
			await createNodes(
				[
					'MainType',
					{
						code: mainCode,
						someString: 'Fake Document',
						anotherDocument: 'Another Fake Document',
					},
				],
				[
					'MainType',
					{
						code: otherCode,
						anotherDocument: 'A Third Fake Document',
					},
				],
			);

			const { status, body } = await absorbHandler()({
				...input,
				codeToAbsorb: otherCode,
			});
			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someString: 'Fake Document',
				anotherDocument: 'Another Fake Document',
			});
			await neo4jTest('MainType', otherCode).notExists();
		});
	});

	describe('regression tests', () => {
		it('Can still delete specific relationships without erroring', async () => {
			const [main, child] = await createNodes(
				[
					'MainType',
					{
						code: mainCode,
					},
				],
				[
					'ChildType',
					{
						code: otherCode,
					},
				],
			);

			await connectNodes(main, 'HAS_CHILD', child);
			const { status, body } = await patchHandler({ documentStore })(
				getInput(
					{ '!children': [otherCode] },
					{ relationshipAction: 'replace' },
				),
			);

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
			});
			expect(body).not.toMatchObject({
				children: expect.any(Array),
			});

			await neo4jTest('MainType', mainCode)
				.exists()
				.hasRels(0);
		});
	});
});

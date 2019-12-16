const fs = require('fs');
const path = require('path');
const primitiveTypesMap = require('../../lib/primitive-types-map');
const { SDK } = require('../../sdk');
const { readYaml } = require('../../lib/updater');

const stringPatterns = readYaml.file(
	process.env.TREECREEPER_SCHEMA_DIRECTORY,
	'string-patterns.yaml',
);

const graphqlFromRawData = schema => {
	return new SDK({ schemaData: { schema } }).getGraphqlDefs();
};

const explodeString = str =>
	str
		.split('\n')
		// exclude strings which are just whitespace or empty
		.filter(string => !/^[\s]*$/.test(string))
		.map(string => string.trim());

const expectedGraphqlSchemaString = fs.readFileSync(
	path.join(__dirname, 'fixtures/generated-schema.graphql'),
	'utf8',
);

describe('graphql def creation', () => {
	it('generates expected graphql def given schema', () => {
		const schema = {
			types: [
				{
					name: 'CostCentre',
					description: 'A cost centre which groups are costed to',
					properties: {
						code: {
							type: 'Word',
							required: true,
							unique: true,
							canIdentify: true,
							description: 'Unique code/id for this item',
							pattern: 'COST_CENTRE',
						},
						name: {
							type: 'Word',
							canIdentify: true,
							description: 'The name of the cost centre',
						},
						hasGroups: {
							type: 'Group',
							relationship: 'PAYS_FOR',
							direction: 'outgoing',
							hasMany: true,
							description:
								'The groups which are costed to the cost centre',
						},
						hasNestedGroups: {
							type: 'Group',
							hasMany: true,
							cypher:
								'MATCH (this)-[:PAYS_FOR*1..20]->(related:Group) RETURN DISTINCT related',
							description:
								'The recursive groups which are costed to the cost centre',
						},
						embezzledBy: {
							type: 'Frauds',
							description: 'Group that embezzles description',
							label: 'Group that embezzles label',
						},
					},
				},
				{
					name: 'Group',
					description:
						'An overarching group which contains teams and is costed separately',
					properties: {
						code: {
							type: 'Word',
							required: true,
							unique: true,
							canIdentify: true,
							description: 'Unique code/id for this item',
							pattern: 'COST_CENTRE',
						},
						name: {
							type: 'Word',
							canIdentify: true,
							description: 'The name of the group',
						},
						isActive: {
							type: 'Boolean',
							description:
								'Whether or not the group is still in existence',
						},
						hasBudget: {
							type: 'CostCentre',
							relationship: 'PAYS_FOR',
							direction: 'incoming',
							description:
								'The Cost Centre associated with the group',
						},
						embezzles: {
							type: 'Frauds',
							description: 'CostCentre to embezzle description',
							label: 'CostCentre to embezzle label',
						},
					},
				},
			],
			relationshipTypes: [
				{
					name: 'Frauds',
					from: { type: 'CostCentre', hasMany: false },
					to: { type: 'Group', hasMany: false },
					relationship: 'EMBEZZLES',
					properties: {
						jurisdiction: {
							type: 'Word',
							label: 'Jusrisdiction label',
							description: 'Jusrisdiction description',
						},
					},
				},
			],
			enums: {
				Lifecycle: {
					description: 'The lifecycle stage of a product',
					options: {
						Incubate: 'Incubate description',
						Sustain: 'Sustain description',
						Grow: 'Grow description',
						Sunset: 'Sunset description',
					},
				},
				TrafficLight: {
					description:
						'Quality rating based on Red, Amber and Green.',
					options: ['Red', 'Amber', 'Green'],
				},
			},
			stringPatterns,
		};

		const generated = [].concat(
			...graphqlFromRawData(schema).map(explodeString),
		);
		expect(generated).toEqual(explodeString(expectedGraphqlSchemaString));
	});

	describe('deprecation', () => {
		it('can deprecate a property', () => {
			const schema = {
				types: [
					{
						name: 'Fake',
						description: 'Fake type description',
						properties: {
							prop: {
								type: 'Boolean',
								deprecationReason: 'not needed',
								description: 'a description',
							},
						},
					},
				],
				enums: {},
				stringPatterns,
			};
			const generated = [].concat(...graphqlFromRawData(schema)).join('');
			// note the regex has a space, not a new line
			expect(generated).toContain(
				'prop: Boolean  @deprecated(reason: "not needed")',
			);
		});

		it('can deprecate a relationship property', () => {
			const schema = {
				types: [
					{
						name: 'Fake',
						description: 'Fake type description',
						properties: {
							prop: {
								type: 'FakeRel',
								deprecationReason: 'not needed',
								description: 'a description',
								direction: 'outgoing',
							},
						},
					},
				],
				relationshipTypes: [
					{
						name: 'FakeRel',
						relationship: 'HAS',
						from: {
							type: 'Fake',
							hasMany: true,
						},
						to: {
							type: 'Fake',
							hasMany: true,
						},
						isMutual: true,
					},
				],
				enums: {},
				stringPatterns,
			};
			const generated = [].concat(...graphqlFromRawData(schema)).join('');
			// note the regex has a space, not a new line
			expect(generated).toContain(
				'prop(first: Int, offset: Int): [Fake] @relation(name: "HAS", direction: "OUT") @deprecated(reason: "not needed")',
			);
		});
	});

	describe('converting types', () => {
		Object.entries(primitiveTypesMap).forEach(
			([bizopsType, graphqlType]) => {
				it(`Outputs correct type for properties using ${bizopsType}`, () => {
					const schema = {
						types: [
							{
								name: 'Fake',
								description: 'Fake type description',
								properties: {
									prop: {
										type: bizopsType,
										description: 'a description',
									},
								},
							},
						],
						enums: {},
						stringPatterns,
					};
					const generated = []
						.concat(...graphqlFromRawData(schema))
						.join('');

					expect(generated).toMatch(
						new RegExp(`prop: ${graphqlType}`),
					);
				});
			},
		);
	});
});

/* global it, describe, expect */
const fs = require('fs');
const path = require('path');
const { SDK } = require('@financial-times/tc-schema-sdk');
const { typeTestSuite, relationshipTestSuite } = require('./type-test-suite');

const sdk = new SDK();
sdk.init();
const { readYaml } = sdk;

const makePath = dir =>
	path.join(process.cwd(), process.env.TREECREEPER_SCHEMA_DIRECTORY, dir);

describe('consistent name property', () => {
	describe('types', () => {
		fs.readdirSync(makePath('types'))
			.filter(fileName => /\.yaml$/.test(fileName))
			.forEach(fileName => {
				it(`${fileName} has consistent name property`, () => {
					const contents = readYaml.file(
						process.env.TREECREEPER_SCHEMA_DIRECTORY,
						path.join('types', fileName),
					);
					expect(`${contents.name}.yaml`).toBe(fileName);
				});
			});
	});
	const relationshipsDir = makePath('relationships');
	if (fs.existsSync(relationshipsDir)) {
		describe('relationships', () => {
			fs.readdirSync(relationshipsDir)
				.filter(fileName => /\.yaml$/.test(fileName))
				.forEach(fileName => {
					it(`${fileName} has consistent name property`, () => {
						const contents = readYaml.file(
							process.env.TREECREEPER_SCHEMA_DIRECTORY,
							path.join('relationships', fileName),
						);
						expect(`${contents.name}.yaml`).toBe(fileName);
					});
				});
		});
	}
});

describe('validate types', () => {
	sdk.rawData.getTypes().forEach(typeTestSuite);
});

describe('validate rich relationships', () => {
	sdk.rawData.getRelationshipTypes().forEach(relationshipTestSuite);
});

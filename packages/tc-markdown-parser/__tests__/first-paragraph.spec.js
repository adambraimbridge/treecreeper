const schema = require('@financial-times/tc-schema-sdk');
const { default: here } = require('outdent');
const { getParser } = require('..');

schema.init({
	updateMode: 'poll',
	logger: console,
});

const parser = getParser({
	type: 'MainType',
});

test('any top level content outside an h2-range is parsed as description by default', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		# well

		hello monkey

		## some string

		https://ft.com?
	`);
	expect(errors.length).toBe(0);
	expect(data).toHaveProperty('description', 'hello monkey');
});

test('any top level content outside an h2-range is parsed as configured field', async () => {
	const paragraphParser = getParser({
		type: 'MainType',
		descriptionFieldName: 'configured',
	});

	const { data, errors } = await paragraphParser.parseMarkdownString(here`
		# well

		hello monkey

		## some string

		https://ft.com?
	`);
	expect(errors.length).toBe(0);
	expect(data).toHaveProperty('configured', 'hello monkey');
});

test('top level content in an h2-range is not parsed as description', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		# i have a heading
		## some string
		how's tricks
	`);
	expect(errors.length).toBe(0);
	expect(data).not.toHaveProperty('description');
});

test('disallow mutiple description in blocks', async () => {
	const { data, errors } = await parser.parseMarkdownString(here`
		# well

		this is first description

		this is second desctiption

		## some string

		how's tricks
	`);
	expect(errors.length).toBe(1);
	const [{ message }] = errors;
	expect(message).toMatch(/Description must be a single paragraph/);
	expect(data).toMatchObject({
		name: 'well',
		description: 'this is first description',
		someString: "how's tricks",
	});
});

test('capture markdown within the paragraph', async () => {
	const complexDescription = `this is a \`code sample\`.
this is [a link](http://biz-ops.com).`;
	const { data, errors } = await parser.parseMarkdownString(here`
		# well

		${complexDescription}
	`);
	expect(errors.length).toBe(0);
	expect(data.description).toEqual(complexDescription);
});

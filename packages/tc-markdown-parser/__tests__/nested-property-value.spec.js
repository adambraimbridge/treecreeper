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

// The weird string concatenation in the markdown fixture is so that
// dev tooling doesn't tidy up the 'extraneous' whitespace
const addLineBreaks = str =>
	str
		.replace(/\t+/g, '\t')
		.split('\n')
		.join('  \n');

describe('nested property definition tests', () => {
	describe('single relationship case - hasMany: false', () => {
		it('can be parsed only code definition as an object', async () => {
			const { data, errors } = await parser.parseMarkdownString(here`
				# name

				## favourite child

				example-code
				`);

			expect(errors).toHaveLength(0);
			expect(data).toEqual({
				name: 'name',
				favouriteChild: {
					code: 'example-code',
				},
			});
		});

		it('can be parsed as object which additional property definitions', async () => {
			const { data, errors } = await parser.parseMarkdownString(here`
				# name

				## curious child

				example-code
					someString: i like it
					someBoolean: yes
			`);

			expect(errors).toHaveLength(0);
			expect(data).toEqual({
				name: 'name',
				curiousChild: {
					code: 'example-code',
					someString: 'i like it',
					someBoolean: true,
				},
			});
		});

		it('can be parsed as object which additional property definitions with line breaks', async () => {
			const { data, errors } = await parser.parseMarkdownString(here`
				# name

				## curious child

				${addLineBreaks(`example-code
					someString: i like it
					someBoolean: yes`)}
			`);

			expect(errors).toHaveLength(0);
			expect(data).toEqual({
				name: 'name',
				curiousChild: {
					code: 'example-code',
					someString: 'i like it',
					someBoolean: true,
				},
			});
		});
	});

	describe('boolean type conversion', () => {
		const expects = {
			yes: true,
			true: true,
			// the headings for these are using the labels
			'👍': true,
			'👎': false,
		};
		Object.entries(expects).forEach(([bool, actual]) => {
			it(`hasMany: false - '${bool}' should be coerced to boolean`, async () => {
				const { data } = await parser.parseMarkdownString(here`
					# name

					## curious child

					example-code
						someBoolean: ${bool}
				`);
				expect(data).toEqual({
					name: 'name',
					curiousChild: {
						code: 'example-code',
						someBoolean: actual,
					},
				});
			});
			it(`hasMany: true - '${bool}' should be coerced to boolean`, async () => {
				const childParser = getParser({
					type: 'ChildType',
				});
				const { data } = await childParser.parseMarkdownString(here`
					# name

					## is curious child of

					- main-code
						someBoolean: ${bool}
				`);
				expect(data).toEqual({
					name: 'name',
					isCuriousChildOf: [
						{
							code: 'main-code',
							someBoolean: actual,
						},
					],
				});
			});
		});
	});

	describe('integer type conversion', () => {
		const expects = {
			'10.5': 10,
			'-1': -1,
			'1e7': 10000000,
		};
		Object.entries(expects).forEach(([integer, actual]) => {
			it(`hasMany: false - ${integer} should be coerced to integer`, async () => {
				const { data } = await parser.parseMarkdownString(here`
					# name

					## curious child

					example-code
						someInteger: ${integer}
				`);
				expect(data).toEqual({
					name: 'name',
					curiousChild: {
						code: 'example-code',
						someInteger: actual,
					},
				});
			});
			it(`hasMany: true ${integer} should be coerced to integer`, async () => {
				const childParser = getParser({
					type: 'ChildType',
				});
				const { data } = await childParser.parseMarkdownString(here`
					# name

					## is curious child of

					- main-code
						someInteger: ${integer}
				`);
				expect(data).toEqual({
					name: 'name',
					isCuriousChildOf: [
						{
							code: 'main-code',
							someInteger: actual,
						},
					],
				});
			});
		});
	});

	describe('enum type conversion', () => {
		it('enum on single relationship', async () => {
			const { data } = await parser.parseMarkdownString(here`
					# name

					## curious child

					child-code
						someEnum: first
				`);

			expect(data).toEqual({
				name: 'name',
				curiousChild: {
					code: 'child-code',
					someEnum: 'First',
				},
			});
		});
		it('enum on many relationships', async () => {
			const childParser = getParser({
				type: 'ChildType',
			});
			const { data } = await childParser.parseMarkdownString(here`
					# name

					## is curious child of

					- main-code
						someEnum: first
				`);

			expect(data).toEqual({
				name: 'name',
				isCuriousChildOf: [
					{
						code: 'main-code',
						someEnum: 'First',
					},
				],
			});
		});
		it('multiple choice enum on single relationship', async () => {
			const { data } = await parser.parseMarkdownString(here`
					# name

					## curious child

					child-code
						someMultipleChoice: first,second
				`);
			expect(data).toEqual({
				name: 'name',
				curiousChild: {
					code: 'child-code',
					someMultipleChoice: ['First', 'Second'],
				},
			});
		});
		it('multiple choice enum on many relationships', async () => {
			const childParser = getParser({
				type: 'ChildType',
			});
			const { data } = await childParser.parseMarkdownString(here`
					# name

					## is curious child of

					- main-code
						someMultipleChoice: first,second
				`);
			expect(data).toEqual({
				name: 'name',
				isCuriousChildOf: [
					{
						code: 'main-code',
						someMultipleChoice: ['First', 'Second'],
					},
				],
			});
		});

		it('multiple choice enum trims whitespace', async () => {
			const { data } = await parser.parseMarkdownString(here`
					# name

					## curious child

					child-code
						someMultipleChoice:   	  first,	  second
				`);
			expect(data).toEqual({
				name: 'name',
				curiousChild: {
					code: 'child-code',
					someMultipleChoice: ['First', 'Second'],
				},
			});
		});
	});

	describe('float type conversion', () => {
		const expects = {
			'0.00001': 0.00001,
			'-1.05': -1.05,
		};
		Object.entries(expects).forEach(([float, actual]) => {
			it(`hasMany: false - ${float} should be coerced to float`, async () => {
				const { data } = await parser.parseMarkdownString(here`
					# name

					## curious child

					example-code
						someFloat: ${float}
				`);
				expect(data).toEqual({
					name: 'name',
					curiousChild: {
						code: 'example-code',
						someFloat: actual,
					},
				});
			});
			it(`hasMany: true ${float} should be coerced to float`, async () => {
				const childParser = getParser({
					type: 'ChildType',
				});
				const { data } = await childParser.parseMarkdownString(here`
					# name

					## is curious child of

					- main-code
						someFloat: ${float}
				`);
				expect(data).toEqual({
					name: 'name',
					isCuriousChildOf: [
						{
							code: 'main-code',
							someFloat: actual,
						},
					],
				});
			});
		});
	});

	describe('throws syntax error on mutiline definition', () => {
		it('mutiline property name should be a lower camel case', async () => {
			const { data, errors } = await parser.parseMarkdownString(here`
				# name

				## curious child

				example-code
					some string: i like it
			`);

			expect(errors).toHaveLength(1);
			expect(data.name).toEqual('name');
			const [{ message, line }] = errors;
			expect(message).toMatch(/should be lower camel case/);
			expect(line).toBe(6);
		});

		it('unexpected property separator found', async () => {
			const { data, errors } = await parser.parseMarkdownString(here`
				# name

				## curious child

				example-code
					: i like it
			`);

			expect(errors).toHaveLength(1);
			expect(data.name).toEqual('name');
			const [{ message, line }] = errors;
			expect(message).toMatch(/unexpected property name separator/);
			expect(line).toBe(6);
		});

		it('linefeed character without property name', async () => {
			const { data, errors } = await parser.parseMarkdownString(here`
				# name

				## curious child

				example-code
					i like it
					someString: i like it, too
			`);

			expect(errors).toHaveLength(1);
			expect(data.name).toEqual('name');
			const [{ message, line }] = errors;
			expect(message).toMatch(/unexpected linefeed token found/);
			expect(line).toBe(6);
		});

		it('unexpected remaining definition', async () => {
			const { data, errors } = await parser.parseMarkdownString(here`
				# name

				## curious child

				example-code
					someString: i like it
					i like it, too
			`);

			expect(errors).toHaveLength(1);
			expect(data.name).toEqual('name');
			const [{ message, line }] = errors;
			expect(message).toMatch(
				/Unexpected character remains 'i like it, too'/,
			);
			expect(line).toBe(7);
		});

		it('property value must not be empty', async () => {
			const { data, errors } = await parser.parseMarkdownString(here`
				# name

				## curious child

				example-code
					someString:
			`);

			expect(errors).toHaveLength(1);
			expect(data.name).toEqual('name');
			const [{ message, line }] = errors;
			expect(message).toMatch(
				/property value for someString must not be empty/,
			);
			expect(line).toBe(6);
		});

		it('property name must exist in schema', async () => {
			const { data, errors } = await parser.parseMarkdownString(here`
				# name

				## curious child

				example-code
					notInSchema: not in schema
			`);

			expect(errors).toHaveLength(1);
			expect(data.name).toEqual('name');
			const [{ message, line }] = errors;
			expect(message).toMatch(/i couldn't resolve notInSchema/);
			expect(line).toBe(6);
		});
	});

	describe('mutiple relationship case - hasMany: true', () => {
		it('can be parsed as plain string array', async () => {
			const { data, errors } = await parser.parseMarkdownString(here`
				# name

				## younger siblings

				* example-sibling-01
				* example-sibling-02
				`);

			expect(errors).toHaveLength(0);
			expect(data).toEqual({
				name: 'name',
				youngerSiblings: [
					{
						code: 'example-sibling-01',
					},
					{
						code: 'example-sibling-02',
					},
				],
			});
		});

		it('can be parsed as Array of objects with additional property definitions', async () => {
			const childParser = getParser({
				type: 'ChildType',
			});
			const { data, errors } = await childParser.parseMarkdownString(here`
				# name

				## is curious child of

				- example-code01
					someString: i like it
					someBoolean: yes
				- example-code02
					someString: i like it, too
					someBoolean: no
			`);

			expect(errors).toHaveLength(0);
			expect(data).toEqual({
				name: 'name',
				isCuriousChildOf: [
					{
						code: 'example-code01',
						someString: 'i like it',
						someBoolean: true,
					},
					{
						code: 'example-code02',
						someString: 'i like it, too',
						someBoolean: false,
					},
				],
			});
		});

		it('can be parsed as Array of objects with additional property definitions with line breaks', async () => {
			const childParser = getParser({
				type: 'ChildType',
			});
			const { data, errors } = await childParser.parseMarkdownString(here`
				# name

				## is curious child of

				${addLineBreaks(`- example-code01
					someString: i like it
					someBoolean: yes`)}
				${addLineBreaks(`- example-code02
					someString: i like it, too
					someBoolean: no`)}
			`);

			expect(errors).toHaveLength(0);
			expect(data).toEqual({
				name: 'name',
				isCuriousChildOf: [
					{
						code: 'example-code01',
						someString: 'i like it',
						someBoolean: true,
					},
					{
						code: 'example-code02',
						someString: 'i like it, too',
						someBoolean: false,
					},
				],
			});
		});

		it('mixed case of having properties and not having', async () => {
			const childParser = getParser({
				type: 'ChildType',
			});
			const { data, errors } = await childParser.parseMarkdownString(here`
				# name

				## is curious child of

				* example-sibling-01
					someString: prop01
				* example-sibling-02
				`);

			expect(errors).toHaveLength(0);
			expect(data).toEqual({
				name: 'name',
				isCuriousChildOf: [
					{
						code: 'example-sibling-01',
						someString: 'prop01',
					},
					{
						code: 'example-sibling-02',
					},
				],
			});
		});
	});
});

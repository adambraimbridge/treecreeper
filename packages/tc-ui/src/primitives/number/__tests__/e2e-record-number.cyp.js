const {
	code,
	someString,
	someInteger,
} = require('../../../test-helpers/mainTypeData.json');
const {
	populateMinimumViableFields,
	save,
	resetDb,
} = require('../../../test-helpers/cypress');

describe('End-to-end - record Number type', () => {
	beforeEach(() => {
		cy.wrap(resetDb()).then(() => {
			populateMinimumViableFields(code);
		});
	});

	it('can record an integer', () => {
		cy.get('input[name=someInteger]').type(someInteger);
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someString').should('have.text', someString);
		cy.get('#someInteger').should('have.text', String(someInteger));
	});

	it('can not accept non-integer value', () => {
		cy.get('input[name=someInteger]').type(someInteger / 7);
		save();

		cy.url().should('contain', '/MainType/create');
		cy.get('.o-message__content-main').should(
			'contain',
			'Oops. Could not create MainType record for e2e-demo',
		);
		cy.get('.o-message__content-additional').should(
			'contain',
			`Invalid value \`${someInteger /
				7}\` for property \`someInteger\` on type \`MainType\`: Must be a finite integer`,
		);
	});
});

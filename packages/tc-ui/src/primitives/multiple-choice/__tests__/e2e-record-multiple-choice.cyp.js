const { code } = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	visitMainTypePage,
	visitEditPage,
	save,
} = require('../../../test-helpers/cypress');

describe('End-to-end - record multiple choice value', () => {
	beforeEach(() => {
		cy.wrap(createType({ code, type: 'MainType' })).then(() => {
			visitMainTypePage();
			visitEditPage();
		});
	});

	it('can record a single choice', () => {
		cy.get('#checkbox-someMultipleChoice-First').check({ force: true });

		cy.get('#checkbox-someMultipleChoice-First')
			.should('have.value', 'First')
			.should('be.checked');
		cy.get('#checkbox-someMultipleChoice-Second')
			.should('have.value', 'Second')
			.should('not.be.checked');
		cy.get('#checkbox-someMultipleChoice-Third')
			.should('have.value', 'Third')
			.should('not.be.checked');
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someMultipleChoice span:first-child').should(
			'have.text',
			'First',
		);
		cy.get('#someMultipleChoice')
			.children()
			.should('have.length', 1);
	});

	it('can record multiple choices', () => {
		cy.get('#checkbox-someMultipleChoice-First').check({ force: true });
		cy.get('#checkbox-someMultipleChoice-Third').check({ force: true });

		cy.get('#checkbox-someMultipleChoice-First')
			.should('have.value', 'First')
			.should('be.checked');
		cy.get('#checkbox-someMultipleChoice-Second')
			.should('have.value', 'Second')
			.should('not.be.checked');
		cy.get('#checkbox-someMultipleChoice-Third')
			.should('have.value', 'Third')
			.should('be.checked');
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someMultipleChoice span:first-child').should(
			'have.text',
			'First',
		);
		cy.get('#someMultipleChoice span:last-child').should(
			'have.text',
			'Third',
		);
		cy.get('#someMultipleChoice')
			.children()
			.should('have.length', 2);
	});

	it('can record all choices', () => {
		cy.get('#checkbox-someMultipleChoice-First').check({ force: true });
		cy.get('#checkbox-someMultipleChoice-Second').check({ force: true });
		cy.get('#checkbox-someMultipleChoice-Third').check({ force: true });

		cy.get('#checkbox-someMultipleChoice-First')
			.should('have.value', 'First')
			.should('be.checked');
		cy.get('#checkbox-someMultipleChoice-Second')
			.should('have.value', 'Second')
			.should('be.checked');
		cy.get('#checkbox-someMultipleChoice-Third')
			.should('have.value', 'Third')
			.should('be.checked');
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someMultipleChoice span:first-child').should(
			'have.text',
			'First',
		);
		cy.get('#someMultipleChoice span:nth-child(2)').should(
			'have.text',
			'Second',
		);
		cy.get('#someMultipleChoice span:nth-child(3)').should(
			'have.text',
			'Third',
		);
		cy.get('#someMultipleChoice span:last-child').should(
			'have.text',
			'Third',
		);
		cy.get('#someMultipleChoice')
			.children()
			.should('have.length', 3);
	});

	it('can deselect a choice', () => {
		cy.get('#checkbox-someMultipleChoice-First').check({ force: true });

		cy.get('#checkbox-someMultipleChoice-First')
			.should('have.value', 'First')
			.should('be.checked');
		cy.get('#checkbox-someMultipleChoice-Second')
			.should('have.value', 'Second')
			.should('not.be.checked');
		cy.get('#checkbox-someMultipleChoice-Third')
			.should('have.value', 'Third')
			.should('not.be.checked');
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someMultipleChoice span:first-child').should(
			'have.text',
			'First',
		);
		cy.get('#someMultipleChoice')
			.children()
			.should('have.length', 1);

		visitEditPage();
		cy.get('#checkbox-someMultipleChoice-First').uncheck({ force: true });
		cy.get('#checkbox-someMultipleChoice-First')
			.should('have.value', 'First')
			.should('not.be.checked');
		save();

		cy.get('#someMultipleChoice').should('not.exist');
	});

	it('can deselect all choices', () => {
		cy.get('#checkbox-someMultipleChoice-First').check({ force: true });
		cy.get('#checkbox-someMultipleChoice-Second').check({ force: true });
		cy.get('#checkbox-someMultipleChoice-Third').check({ force: true });

		cy.get('#checkbox-someMultipleChoice-First')
			.should('have.value', 'First')
			.should('be.checked');
		cy.get('#checkbox-someMultipleChoice-Second')
			.should('have.value', 'Second')
			.should('be.checked');
		cy.get('#checkbox-someMultipleChoice-Third')
			.should('have.value', 'Third')
			.should('be.checked');
		save();

		cy.get('#code').should('have.text', code);
		cy.get('#someMultipleChoice span:first-child').should(
			'have.text',
			'First',
		);
		cy.get('#someMultipleChoice span:nth-child(2)').should(
			'have.text',
			'Second',
		);
		cy.get('#someMultipleChoice span:last-child').should(
			'have.text',
			'Third',
		);
		cy.get('#someMultipleChoice')
			.children()
			.should('have.length', 3);

		visitEditPage();
		cy.get('#checkbox-someMultipleChoice-First').uncheck({ force: true });
		cy.get('#checkbox-someMultipleChoice-Second').uncheck({ force: true });
		cy.get('#checkbox-someMultipleChoice-Third').uncheck({ force: true });
		cy.get('#checkbox-someMultipleChoice-First')
			.should('have.value', 'First')
			.should('not.be.checked');
		cy.get('#checkbox-someMultipleChoice-Second')
			.should('have.value', 'Second')
			.should('not.be.checked');
		cy.get('#checkbox-someMultipleChoice-Third')
			.should('have.value', 'Third')
			.should('not.be.checked');
		save();

		cy.get('#someMultipleChoice').should('not.exist');
	});
});

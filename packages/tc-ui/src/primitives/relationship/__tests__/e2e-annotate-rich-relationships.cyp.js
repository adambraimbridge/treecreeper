const {
	code,
	someString,
	anotherString,
	someEnum,
} = require('../../../test-helpers/mainTypeData.json');
const {
	populateMinimumViableFields,
	populateParentTypeFields,
	pickCuriousChild,
	pickCuriousParent,
	visitEditPage,
	visitMainTypePage,
	save,
	resetDb,
	setPropsOnCuriousParentRel,
	setPropsOnCuriousChildRel,
	populateCuriousChildRelationshipFields,
	populateCuriousParent1RelationshipFields,
	populateCuriousParent2RelationshipFields,
} = require('../../../test-helpers/cypress');

describe('End-to-end - annotate rich relationship properties', () => {
	beforeEach(() => {
		resetDb();
		populateMinimumViableFields(code);
		save();
		populateParentTypeFields(`${code}-parent-one`);
		save();
		populateParentTypeFields(`${code}-parent-two`);
		save();
		visitMainTypePage();
	});

	it('does not render fields on page load', () => {
		visitEditPage();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		visitMainTypePage();
		visitEditPage();

		cy.get('#ul-curiousChild .treecreeper-relationship-annotate').should(
			'not.exist',
		);
	});

	it('renders fields when Annotate button is clicked', () => {
		visitEditPage();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		visitMainTypePage();
		visitEditPage();

		cy.get('#ul-curiousChild li')
			.find('button.relationship-annotate-button')
			.click({ force: true });

		cy.get(
			'#ul-curiousChild span.treecreeper-relationship-annotate',
		).should('be.visible');
	});

	it('hides fields when Annotate button is clicked, if they are visible', () => {
		visitEditPage();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		visitMainTypePage();
		visitEditPage();

		cy.get('#ul-curiousChild li')
			.find('button.relationship-annotate-button')
			.click({ force: true });

		cy.get(
			'#ul-curiousChild span.treecreeper-relationship-annotate',
		).should('be.visible');

		cy.get('#ul-curiousChild li')
			.find('button.relationship-annotate-button')
			.click({ force: true });

		cy.get('#ul-curiousChild .treecreeper-relationship-annotate').should(
			'not.exist',
		);
	});

	it('displays all fields defined for that relationship property', () => {
		visitEditPage();
		pickCuriousParent();
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousParentRel(`${code}-parent-one`));
		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		visitEditPage();

		cy.get('#ul-curiousChild li')
			.find('button.relationship-annotate-button')
			.click({ force: true });

		cy.get(
			'#ul-curiousChild span.treecreeper-relationship-annotate',
		).should('be.visible');

		cy.get('#ul-curiousChild .treecreeper-relationship-annotate').then(
			parent => {
				cy.wrap(parent)
					.find('#id-someString')
					.should('be.visible');
				cy.wrap(parent)
					.find('#id-anotherString')
					.should('be.visible');
				cy.wrap(parent)
					.find('#id-someString')
					.should('be.visible');
				cy.wrap(parent)
					.find('#id-someInteger')
					.should('be.visible');
				cy.wrap(parent)
					.find('#id-someEnum')
					.should('be.visible');
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-First')
					.should('be.visible');
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-Second')
					.should('be.visible');
				cy.wrap(parent)
					.find('#checkbox-someMultipleChoice-Third')
					.should('be.visible');
				cy.wrap(parent)
					.find('#radio-someBoolean-Yes')
					.should('be.visible');
				cy.wrap(parent)
					.find('#radio-someBoolean-No')
					.should('be.visible');
				cy.wrap(parent)
					.find('#id-someFloat')
					.should('be.visible');
			},
		);

		cy.get('#ul-curiousParent li')
			.find('button.relationship-annotate-button')
			.click({ force: true });

		cy.get('#ul-curiousParent .treecreeper-relationship-annotate').should(
			'be.visible',
		);

		cy.get('#ul-curiousParent .treecreeper-relationship-annotate').then(
			parent => {
				cy.wrap(parent)
					.find('#id-someString')
					.should('be.visible');
				cy.wrap(parent)
					.find('#id-anotherString')
					.should('be.visible');
			},
		);
	});

	it('can save annotations for one-to-one relationship', () => {
		visitEditPage();
		pickCuriousChild();
		save();

		visitEditPage();
		cy.get('#ul-curiousChild li')
			.find('button.relationship-annotate-button')
			.click({ force: true });

		populateCuriousChildRelationshipFields();
		save();

		cy.get('#curiousChild')
			.parent()
			.find('[data-o-component="o-expander"] button.o-expander__toggle')
			.click({ force: true });
		cy.get('#curiousChild')
			.parent()
			.then(parent => {
				cy.wrap(parent)
					.find('#someString')
					.should('have.text', someString);
				cy.wrap(parent)
					.find('#anotherString')
					.should('have.text', anotherString);
				cy.wrap(parent)
					.find('#someInteger')
					.should('have.text', '2023');
				cy.wrap(parent)
					.find('#someEnum')
					.should('have.text', someEnum);
				cy.wrap(parent)
					.find('#someMultipleChoice span:first-of-type')
					.should('have.text', 'First');
				cy.wrap(parent)
					.find('#someMultipleChoice span:last-of-type')
					.should('have.text', 'Third');
				cy.wrap(parent)
					.find('#someBoolean')
					.should('have.text', 'Yes');
				cy.wrap(parent)
					.find('#someFloat')
					.should('have.text', '20.23');
			});
	});
	it('can save annotations for one-to-many relationship', () => {
		visitEditPage();
		pickCuriousParent();
		pickCuriousParent();
		save();

		visitEditPage();
		cy.get('#ul-curiousParent')
			.children()
			.first()
			.then(parent => {
				cy.wrap(parent)
					.find('button.relationship-annotate-button')
					.click({ force: true });
				populateCuriousParent1RelationshipFields(parent);
			});
		cy.get('#ul-curiousParent')
			.children()
			.eq(1)
			.then(parent => {
				cy.wrap(parent)
					.find('button.relationship-annotate-button')
					.click({ force: true });
				populateCuriousParent2RelationshipFields(parent);
			});
		save();

		cy.get('#curiousParent')
			.children()
			.first()
			.then(child => {
				cy.wrap(child)
					.find(
						'[data-o-component="o-expander"] button.o-expander__toggle',
					)
					.click({ force: true });
				cy.wrap(child)
					.find('#someString')
					.should('have.text', someString);
				cy.wrap(child)
					.find('#anotherString')
					.should('have.text', anotherString);
			});

		cy.get('#curiousParent')
			.children()
			.eq(1)
			.then(child => {
				cy.wrap(child)
					.find(
						'[data-o-component="o-expander"] button.o-expander__toggle',
					)
					.click({ force: true });
				cy.wrap(child)
					.find('#someString')
					.should('have.text', 'Parent two someString');
				cy.wrap(child)
					.find('#anotherString')
					.should('have.text', 'Parent two anotherString');
			});
	});
});

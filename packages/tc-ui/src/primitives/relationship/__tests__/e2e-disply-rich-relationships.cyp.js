const { code } = require('../../../test-helpers/mainTypeData.json');
const {
	createType,
	createMainTypeRecordWithChild,
	pickCuriousChild,
	pickCuriousParent,
	visitEditPage,
	visitMainTypePage,
	save,
	setPropsOnCuriousChildRel,
	setPropsOnCuriousParentRel,
} = require('../../../test-helpers/cypress');

describe('End-to-end - display relationship properties', () => {
	beforeEach(() => {
		const firstChild = `${code}-first-child`;
		const secondChild = `${code}-second-child`;
		const parentOne = `${code}-parent-one`;
		const parentTwo = `${code}-parent-two`;
		const c = createType({ code: secondChild, type: 'ChildType' });
		const p1 = createType({ code: parentOne, type: 'ParentType' });
		const p2 = createType({ code: parentTwo, type: 'ParentType' });
		const m = createMainTypeRecordWithChild(code, firstChild);
		cy.wrap(Promise.all([c, p1, p2, m])).then(() => {
			visitMainTypePage();
			visitEditPage();
		});
	});

	it('can display/hide relationship properties', () => {
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		// to refresh the page after updating neo4j
		visitMainTypePage();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#curiousChild')
			.should('have.text', `${code}-first-child`)
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);

		cy.get('#curiousChild')
			.parent()
			.find('[data-o-component="o-expander"] .o-expander__content')
			.should('not.be.visible');

		cy.get('[aria-controls="o-expander__toggle--1"]')
			.should('have.text', 'view details')
			.click();

		cy.get('#curiousChild')
			.parent()
			.then(parent => {
				cy.wrap(parent)
					.find(
						'[data-o-component="o-expander"] .o-expander__content',
					)
					.should('be.visible');
				cy.wrap(parent)
					.find('.treecreeper-relationship-props-list #someEnum')
					.should('have.text', 'First');
				cy.wrap(parent)
					.find(
						'.treecreeper-relationship-props-list #someMultipleChoice span:first-of-type',
					)
					.should('have.text', 'First');
				cy.wrap(parent)
					.find(
						'.treecreeper-relationship-props-list #someMultipleChoice span:last-of-type',
					)
					.should('have.text', 'Third');
			});

		cy.get('[aria-controls="o-expander__toggle--1"]')
			.should('have.text', 'hide details')
			.click();

		cy.get('#curiousChild')
			.parent()
			.then(child => {
				cy.wrap(child)
					.find(
						'[data-o-component="o-expander"] .o-expander__content',
					)
					.should('not.be.visible');
				cy.wrap(child)
					.find('.treecreeper-relationship-props-list #someEnum')
					.should('not.be.visible');
			});
	});

	it('can display properties on a 1-to-1 relationship', () => {
		pickCuriousChild();
		save();

		cy.wrap().then(() => setPropsOnCuriousChildRel(`${code}-first-child`));
		// to refresh the page after updating neo4j
		visitMainTypePage();

		cy.url().should('contain', `/MainType/${code}`);
		cy.get('#curiousChild')
			.should('have.text', `${code}-first-child`)
			.should('have.attr', 'href', `/ChildType/${code}-first-child`);
		cy.get('#curiousChild')
			.parent()
			.get('.treecreeper-relationship-props-list')
			.then(list => {
				cy.wrap(list)
					.find('#someString')
					.should('have.text', 'lorem ipsum');
				cy.wrap(list)
					.find('#someEnum')
					.should('have.text', 'First');
				cy.wrap(list)
					.find('#someBoolean')
					.should('have.text', 'Yes');
			});
	});

	it('can display properties on a 1-to-m relationship', () => {
		pickCuriousParent();
		pickCuriousParent();
		save();

		cy.wrap().then(() => setPropsOnCuriousParentRel(`${code}-parent-one`));
		// to refresh the page after updating neo4j
		visitMainTypePage();

		cy.url().should('contain', `/MainType/${code}`);
		const firstCuriousParentSelector = 'ul#curiousParent li:first-child';
		const secondCuriousParentSelector = 'ul#curiousParent li:last-of-type';

		cy.get(`${firstCuriousParentSelector} a`)
			.should('have.text', `${code}-parent-one`)
			.should('have.attr', 'href', `/ParentType/${code}-parent-one`);
		cy.get(`${firstCuriousParentSelector}`).then(parent => {
			cy.wrap(parent)
				.find('#someString')
				.should('have.text', 'parent lorem ipsum');
			cy.wrap(parent)
				.find('#anotherString')
				.should('have.text', 'parent another lorem ipsum');
		});

		cy.get(`${secondCuriousParentSelector} a`)
			.should('have.text', `${code}-parent-two`)
			.should('have.attr', 'href', `/ParentType/${code}-parent-two`);
		cy.get(`${secondCuriousParentSelector}`).then(parent => {
			cy.wrap(parent)
				.find('#someString')
				.should('not.exist');
			cy.wrap(parent)
				.find('#anotherString')
				.should('not.exist');
		});
	});

	it('can display properties on each relationship in a 1-to-m relationship', () => {
		pickCuriousParent();
		pickCuriousParent();
		save();

		cy.wrap().then(() => setPropsOnCuriousParentRel(`${code}-parent-one`));
		cy.wrap().then(() => setPropsOnCuriousParentRel(`${code}-parent-two`));
		// to refresh the page after updating neo4j
		visitMainTypePage();

		cy.url().should('contain', `/MainType/${code}`);
		const firstCuriousParentSelector = 'ul#curiousParent li:first-child';
		const secondCuriousParentSelector = 'ul#curiousParent li:last-of-type';

		cy.get(`${firstCuriousParentSelector} a`)
			.should('have.text', `${code}-parent-one`)
			.should('have.attr', 'href', `/ParentType/${code}-parent-one`);

		cy.get(`${firstCuriousParentSelector}`).then(parent => {
			cy.wrap(parent)
				.find('#someString')
				.should('have.text', 'parent lorem ipsum');
			cy.wrap(parent)
				.find('#anotherString')
				.should('have.text', 'parent another lorem ipsum');
		});

		cy.get(`${secondCuriousParentSelector} a`)
			.should('have.text', `${code}-parent-two`)
			.should('have.attr', 'href', `/ParentType/${code}-parent-two`);
		cy.get(`${secondCuriousParentSelector}`).then(parent => {
			cy.wrap(parent)
				.find('#someString')
				.should('have.text', 'parent lorem ipsum');
			cy.wrap(parent)
				.find('#anotherString')
				.should('have.text', 'parent another lorem ipsum');
		});
	});
});

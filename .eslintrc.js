/*
	ESLint config file: https://eslint.org/docs/user-guide/configuring
	Configures Javascript linting
	Generated by rel-engage
*/

'use strict';

module.exports = {
	extends: [
		// Cannot use `@financial-times/rel-engage/packages/dotfiles/eslint`
		// as this is translated to `eslint-config-@financial-times/rel-engage/packages/dotfiles/eslint
		'./node_modules/@financial-times/rel-engage/packages/dotfiles/eslint.js'
	],
	rules: {
		"unicorn/prefer-flat-map": "off",
		"unicorn/consistent-function-scoping": "off",
		"jest/valid-describe": "off",
		// lots of user generated free html, so dangerously set html is normal
		'react/no-danger': 0,
		'no-alert': 0,
		'jsx-a11y/control-has-associated-label': 1,
		'react/prop-types': 0,
		// Nothing in the UI allows reordering of lists, so the concern of
		// unecessary rerenders does not - at present - apply
		'react/no-array-index-key': 0
	},
	overrides: [{
		env: {browser: true},
		files: ['**/browser/**/*.js', 'packages/tc-ui/**/browser.{jsx,js}']
	}]
};

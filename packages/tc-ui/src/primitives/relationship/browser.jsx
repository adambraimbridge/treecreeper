require('./main.css');
const React = require('react');
const { hydrate } = require('react-dom');
const { RelationshipPicker } = require('./lib/relationship-picker');
const server = require('./server');

module.exports = {
	...server,
	withEditComponent: container =>
		hydrate(
			<RelationshipPicker {...JSON.parse(container.dataset.props)} />,
			container.parentNode,
		),
};

const React = require('react');
const { getType } = require('@financial-times/tc-schema-sdk');
const { WrappedEditComponent } = require('../../components/edit-helpers');

const { RelationshipPicker } = require('./lib/relationship-picker');

const RelationshipPickerContainer = props => (
	<div>
		<RelationshipPicker {...props} />
	</div>
);

const {
	ViewRelationship,
	setRelationshipAnnotator,
} = require('./lib/view-relationship');

module.exports = {
	ViewComponent: ViewRelationship,
	EditComponent: props => (
		<WrappedEditComponent
			Component={RelationshipPickerContainer}
			componentType="relationship"
			{...props}
		/>
	),
	parser: value => {
		value = JSON.parse(value);
		// TODO use hasValue
		if (!value) {
			return null;
		}
		return Array.isArray(value)
			? value.map(({ code }) => code)
			: value.code;
	},
	hasValue: (value, { hasMany }) =>
		hasMany ? value && value.length : !!value,
	setRelationshipAnnotator,
	graphqlFragment: (propName, { type }) => {
		const typeDef = getType(type);
		const props = new Set(['code']);
		if (typeDef.properties.name) {
			props.add('name');
		}

		Object.entries(typeDef.properties)
			.filter(([, { useInSummary }]) => useInSummary)
			.forEach(([name]) => props.add(name));

		return `${propName} {${[...props].join(' ')}}`;
	},
};

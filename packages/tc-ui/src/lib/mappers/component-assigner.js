const {
	getEnums,
	getTypes,
	getPrimitiveTypes,
} = require('@financial-times/tc-schema-sdk');

const componentAssigner = ({
	customComponents = {},
	customTypeMappings = {},
} = {}) => ({ type, hasMany }) => {
	// TO Do - find a better solution
	/*
		currently if this require is done at top level we get {} the reason for this is due to
		circular dependence
		componentAssigner -> primitives -> relationship/server ->
		relationship-picker -> relationship -> rich-relationship -> componentAssigner
	*/
	// eslint-disable-next-line global-require
	const primitives = require('../../primitives/server');
	const components = { ...primitives, ...customComponents };

console.log('£££££ components: ', components)
console.log('@@@@@ primitives: ', JSON.stringify(primitives, null,2))
console.log('@@@@@ customComponents: ', JSON.stringify(customComponents, null,2))
	const typeToComponentMap = {
		...getPrimitiveTypes({ output: 'component' }),
		...Object.keys(customComponents).reduce(
			(map, name) => ({ ...map, [name]: name }),
			{},
		),
		...customTypeMappings,
	};

	const objectTypes = getTypes().map(objectType => objectType.name);
console.log('££££ typeToComponentMap: ', JSON.stringify(typeToComponentMap, null,2))
console.log('££££ objectTypes: ', JSON.stringify(objectTypes, null,2))

	if (type) {
console.log('££££ type: ', type)
		if (typeToComponentMap[type]) {
console.log('$$$$$$$ comp typetocomponent: ', components[typeToComponentMap[type]])
			return components[typeToComponentMap[type]];
		}
		if (getEnums()[type]) {
console.log('$$$$$$$ comp hasmany: ', hasMany ? components.MultipleChoice : components.Enum)
			return hasMany ? components.MultipleChoice : components.Enum;
		}
		if (objectTypes.includes(type)) {
console.log('$$$$$$$ comp objectincludes: ', components.Relationship)
			return components.Relationship;
		}
	}
console.log('$$$$$$$ no type. components.Text: ', components.Text)
	return components.Text;
};

module.exports = { componentAssigner };

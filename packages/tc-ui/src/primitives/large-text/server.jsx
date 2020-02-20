const React = require('react');
const showdown = require('showdown');
const autolinker = require('autolinker');
const { WrappedEditComponent } = require('../../lib/components/input-wrapper');

showdown.setFlavor('github');

const markdownParser = new showdown.Converter({
	simplifiedAutoLink: true,
});

const markdown = text =>
	typeof window === 'undefined'
		? autolinker.link(markdownParser.makeHtml(text || ''))
		: // eslint-disable-next-line no-undef
		  Autolinker.link(markdownParser.makeHtml(text || ''));

const outputFreeText = (text = '') => text;

const EditLargeText = props => {
	const {
		propertyName,
		value,
		dataType,
		disabled,
		isNested,
		parentCode,
		onChange,
	} = props;
	const name = !isNested ? propertyName : '';
	const handleChange = !isNested ? null : event => onChange(event);
	return (
		<>
			<span className="o-forms-input o-forms-input--textarea">
				<textarea
					name={name}
					id={`id-${propertyName}`}
					rows={dataType === 'Document' ? '40' : '8'}
					disabled={disabled}
					defaultValue={outputFreeText(value)}
					data-parent-code={parentCode}
					onChange={handleChange}
				/>
			</span>
			{dataType === 'Document' ? (
				<div className="document-edit-tools">
					Edit using github flavoured markdown or use the&nbsp;
					<button className="o-buttons wysiwyg-toggle" type="button">
						wysiwyg HTML editor
					</button>
				</div>
			) : null}
		</>
	);
};

module.exports = {
	name: 'LargeText',
	EditComponent: props => (
		<div
			className={
				props.dataType === 'Document'
					? 'o-layout__main__full-span document-field'
					: ''
			}
		>
			<WrappedEditComponent
				Component={EditLargeText}
				componentType="large-text"
				{...props}
			/>
		</div>
	),
	ViewComponent: ({ value, id }) => (
		<section
			id={id}
			dangerouslySetInnerHTML={{ __html: markdown(value) }}
		/>
	),
};

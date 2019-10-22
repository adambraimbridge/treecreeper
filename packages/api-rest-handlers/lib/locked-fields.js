const _isEmpty = require('lodash.isempty');
const { logger } = require('../../api-core/lib/request-context');

const normalizeFieldParam = fieldParam => {
	if (!fieldParam) {
		return [];
	}
	if (Array.isArray(fieldParam) || fieldParam === 'all') {
		return fieldParam;
	}
	return fieldParam.split(',').map(field => field.trim());
};

const getLockFieldList = (body, lockFields) => {
	const fields = lockFields === 'all' ? Object.keys(body) : lockFields;

	return fields.filter(name => name !== 'code');
};

const removeLockedFields = (clientId, unlockFields, existingLockedFields) => {
	const fields = unlockFields.split(',').map(field => field.trim());

	const removedFields = Object.entries(existingLockedFields)
		.filter(([fieldName]) => !fields.includes(fieldName))
		.reduce((newFields, [fieldName, value]) => {
			newFields[fieldName] = value;
			return newFields;
		}, {});

	logger.info({
		event: 'REMOVE_LOCKED_FIELDS',
		fields,
		clientId,
	});
	return removedFields;
};

const setLockFields = (clientId, lockFieldList, existingLockedFields) => {
	const conflictFields = lockFieldList.reduce((conflicts, fieldName) => {
		const lockedByExistingClientId = existingLockedFields[fieldName];
		if (lockedByExistingClientId && lockedByExistingClientId !== clientId) {
			conflicts.push(
				`${fieldName} is locked by ${lockedByExistingClientId}`,
			);
		}
		existingLockedFields[fieldName] = clientId;
		return conflicts;
	}, []);

	if (conflictFields.length) {
		throw new Error(
			`The following fields cannot be locked because they are locked by another client:
				${conflictFields.join(', ')}`,
		);
	}
	logger.info({
		event: 'SET_LOCKED_FIELDS',
		lockFieldList,
		clientId,
	});
	return existingLockedFields;
};

const validatePropertiesAgainstLocked = (clientId, body, newLockedFields) => {
	const clashes = Object.keys(body).reduce((conflicts, fieldName) => {
		const locker = newLockedFields[fieldName];
		if (locker && locker !== clientId) {
			conflicts.push(`${fieldName} is locked by ${locker}`);
		}
		return conflicts;
	}, []);

	if (clashes.length) {
		throw new Error(
			`The following fields cannot be written because they are locked by another client:
				${clashes.join(', ')}`,
		);
	}
};

const mergeLockedFields = ({
	body,
	clientId,
	lockFields,
	unlockFields,
	existingLockedFields = {},
	needValidate = false,
}) => {
	lockFields = normalizeFieldParam(lockFields);
	unlockFields = normalizeFieldParam(unlockFields);

	let newLockedFields = { ...existingLockedFields };
	if (lockFields.length > 0) {
		if (!clientId) {
			throw new Error(
				'clientId needs to be set to a valid system code in order to lock fields',
			);
		}
		const lockFieldList = getLockFieldList(body, lockFields);
		const removedLockFields =
			!_isEmpty(existingLockedFields) && unlockFields !== 'all'
				? removeLockedFields(
						clientId,
						unlockFields,
						existingLockedFields,
				  )
				: {};
		newLockedFields = setLockFields(
			clientId,
			lockFieldList,
			removedLockFields,
		);
	}

	if (needValidate) {
		validatePropertiesAgainstLocked(body, clientId, newLockedFields);
	}

	return Object.keys(newLockedFields).length
		? JSON.stringify(newLockedFields)
		: null;
};

module.exports = {
	mergeLockedFields,
	normalizeFieldParam,
	getLockFieldList,
	removeLockedFields,
	setLockFields,
	validatePropertiesAgainstLocked,
};

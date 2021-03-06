const { upload } = require('./upload');
const { undo } = require('./undo');

const s3Post = async ({ s3Instance, bucketName, type, code, body }) => {
	const params = {
		Bucket: bucketName,
		Key: `${type}/${code}`,
		Body: JSON.stringify(body),
		ContentType: 'application/json',
	};

	const versionId = await upload({
		s3Instance,
		params,
		requestType: 'POST',
	});

	return {
		versionMarker: versionId,
		body,
		undo: undo({
			s3Instance,
			bucketName,
			type,
			code,
			versionMarker: versionId,
		}),
	};
};

module.exports = {
	s3Post,
};

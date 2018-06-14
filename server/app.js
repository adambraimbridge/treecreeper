const express = require('express');
require('express-async-errors');
const logger = require('@financial-times/n-logger').default;
const { ui, graphql, v1 } = require('./routes');
const init = require('../scripts/init');

const ONE_HOUR = 60 * 60 * 1000;

const createApp = () => {
	const app = express();

	app.set('case sensitive routing', true);
	app.set('s3o-cookie-ttl', ONE_HOUR);

	if (process.env.NODE_ENV !== 'production') {
		app.get('/init', init);
	}

	// Redirect a frequent typo to correct path
	app.get('/graphql', (req, res) => {
		res.redirect('/graphiql');
	});

	// Redirect legacy graphql url
	app.use('/api/graphql', (req, res) => {
		res.redirect('/graphql');
	});

	app.use('/graphql', graphql(express.Router())); //eslint-disable-line
	app.use('/v1', v1(express.Router())); //eslint-disable-line
	app.use('/', ui(express.Router())); //eslint-disable-line

	app.use((error, request, response, next) => {
		logger.error(error);
		next(error);
	});

	return app;
};

if (require.main === module) {
	const PORT = process.env.PORT || 8888;

	createApp().listen(PORT, () => {
		logger.info(`Listening on ${PORT}`);
	});
}

module.exports = createApp;

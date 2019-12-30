const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const EncodingPlugin = require('webpack-encoding-plugin');
const path = require('path');

const filenameTemplate = process.env.CIRCLECI
	? '[contenthash].[name]'
	: '[name]';
module.exports = {
	entry: ['./demo/cms/browser/main.js'],
	resolve: {
		extensions: ['.js', '.jsx', '.css', '.scss'],
		modules: ['node_modules', 'node_modules/@financial-times'],
		alias: {
			'sass-mq/mq': 'sass-mq/_mq',
			'mathsass/dist/math': 'mathsass/dist/_math',
		},
	},
	output: {
		path: path.resolve(__dirname, 'dist/browser'),
		filename: `${filenameTemplate}.js`,
	},
	stats: 'minimal',
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
				},
			},
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader'],
			},
			{
				test: /\.scss$/i,
				use: [
					MiniCssExtractPlugin.loader,
					// // Creates `style` nodes from JS strings
					// 'style-loader',
					// Translates CSS into CommonJS
					'css-loader',
					// Compiles Sass to CSS
					'sass-loader',
				],
			},
		],
	},

	devServer: {
		contentBase: './dist/browser',
		inline: false,
		publicPath: '/statics/',
		host: 'local.in.ft.com',
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: `${filenameTemplate}.css`,
		}),
		new ManifestPlugin(),
		new EncodingPlugin({
			encoding: 'utf8',
		}),
	],
};

if (process.env.CIRCLECI) {
	module.exports.devtool = 'source-map';
}

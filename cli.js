'use strict';

const Promise = require('bluebird');
const yargs = require('yargs');
const Client = require('./lib/client');

const REQUEST_METHODS = Object.create(null);
REQUEST_METHODS.makeRequest = '{"path": "STRING"}';
REQUEST_METHODS.getAlbums = '{}';
REQUEST_METHODS.getAlbum = '{"albumId": "STRING"}';
REQUEST_METHODS.getVideosByAlbum = '{"albumId": "STRING"}';
REQUEST_METHODS.getVideos = '{}';
REQUEST_METHODS.getVideo = '{"videoId": "STRING"}';
REQUEST_METHODS.getVideoConfig = '{"videoId": "STRING"}';

const listCommand = () => {
	console.log('Request methods:');
	console.log('');

	Object.getOwnPropertyNames(Client.prototype).forEach(key => {
		if (REQUEST_METHODS[key]) {
			console.log(`\t${key} --args ${REQUEST_METHODS[key]}`);
		}
	});

	return Promise.resolve(null);
};

const requestCommand = args => {
	const accessToken = args.accessToken;
	const method = args.method;

	if (!accessToken) {
		console.error('An accessToken is required (--accessToken)');
		return Promise.resolve(null);
	}

	let params;
	try {
		params = JSON.parse(args.args);
	} catch (err) {
		console.error('--args JSON parsing error:');
		console.error(err.message);
		return Promise.resolve(null);
	}

	const client = new Client({accessToken});

	return client[method](params).then(res => {
		console.log(JSON.stringify(res));
		return null;
	});
};

exports.main = () => {
	const args = yargs
					.usage('Usage: $0 <command> [options]')
					.command('req', 'Make a vimeo client request', {
						method: {
							alias: 'm',
							default: 'makeRequest',
							describe: 'Use the "list" command to see available methods'
						},
						args: {
							alias: 'a',
							default: '{}',
							describe: 'Arguments object as a JSON string'
						},
						accessToken: {
							describe: 'Defaults to env var VIMEO_ACCESS_TOKEN'
						}
					})
					.command('list', 'List vimeo client methods')
					.help();

	const argv = args.argv;
	const command = argv._[0];

	switch (command) {
		case 'list':
			return listCommand();
		case 'req':
			return requestCommand({
				accessToken: argv.accessToken || process.env.VIMEO_ACCESS_TOKEN,
				method: argv.method,
				args: argv.args
			});
		default:
			console.error('A command argument is required.');
			console.error('Use the --help flag to print out help.');
			return Promise.resolve(null);
	}
};

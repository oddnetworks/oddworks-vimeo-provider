'use strict';

const Promise = require('bluebird');
const Client = require('./lib/client');
const defaultVideoTransform = require('./lib/default-video-transform');
const defaultCollectionTransform = require('./lib/default-collection-transform');
const createChannelCache = require('./lib/create-channel-cache');
const fetchVimeoVideo = require('./lib/fetch-vimeo-video');
const fetchVimeoAlbum = require('./lib/fetch-vimeo-album');

const DEFAULTS = {
	collectionTransform: defaultCollectionTransform,
	videoTransform: defaultVideoTransform
};

// options.bus
// options.accessToken
// options.collectionTransform
// options.videoTransform
exports.initialize = options => {
	options = Object.assign({}, DEFAULTS, options || {});

	const bus = options.bus;
	const accessToken = options.accessToken;
	const role = 'provider';
	const cmd = 'get';

	if (!bus || typeof bus !== 'object') {
		throw new Error('oddworks-vimeo-provider requires an Oddcast Bus');
	}

	const collectionTransform = options.collectionTransform;
	const videoTransform = options.videoTransform;

	const client = new Client({bus, accessToken});

	const getChannel = createChannelCache(bus);

	bus.queryHandler(
		{role, cmd, source: 'vimeo-album'},
		exports.createAlbumHandler(bus, getChannel, client, collectionTransform)
	);

	bus.queryHandler(
		{role, cmd, source: 'vimeo-video'},
		exports.createVideoHandler(bus, getChannel, client, videoTransform)
	);

	return Promise.resolve({
		name: 'vimeo-provider',
		client
	});
};

exports.createAlbumHandler = (bus, getChannel, client, transform) => {
	const getCollection = fetchVimeoAlbum(bus, client, transform);

	// Called from Oddworks core via bus.query
	// Expects:
	//	args.spec.album.uri
	return args => {
		const spec = args.spec;
		const album = spec.album || {};
		const albumUri = album.uri;
		const channelId = spec.channel;

		if (!albumUri || typeof albumUri !== 'string') {
			throw new Error(
				'vimeo-album-provider spec.album.uri String is required'
			);
		}

		const collection = args.object;

		return getChannel(channelId).then(channel => {
			return getCollection({spec, channel, collection, albumUri});
		});
	};
};

exports.createVideoHandler = (bus, getChannel, client, transform) => {
	const getVideo = fetchVimeoVideo(bus, client, transform);

	// Called from Oddworks core via bus.query
	// Expects:
	// args.spec.video
	return args => {
		const spec = args.spec;
		const channelId = spec.channel;
		const video = spec.video || {};
		const videoUri = video.uri;

		if (!videoUri || typeof videoUri !== 'string') {
			throw new Error(
				'vimeo-video-provider spec.video.uri String is required'
			);
		}

		return getChannel(channelId).then(channel => {
			return getVideo({spec, channel, videoUri});
		});
	};
};

// options.accessToken *required
// options.bus *optional
exports.createClient = options => {
	options = Object.assign({}, DEFAULTS, options || {});

	const bus = options.bus;
	const accessToken = options.accessToken;

	if (!accessToken || typeof accessToken !== 'string') {
		throw new Error(
			'oddworks-vimeo-provider requires a Vimeo accessToken'
		);
	}

	return new Client({bus, accessToken});
};

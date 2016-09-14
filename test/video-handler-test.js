'use strict';

const test = require('ava');
const nock = require('nock');
const Promise = require('bluebird');

const provider = require('../');
const videoTransform = require('../lib/default-video-transform');
const videoResponse = require('./fixtures/video-response');
const videoConfigResponse = require('./fixtures/video-config-response');
const helpers = require('./helpers');

const getChannel = () => {
	return Promise.resolve({id: 'abc'});
};

let bus;
let videoHandler = null;

test.before(() => {
	nock('https://api.vimeo.com')
		.get('/me/videos/110484775')
		.reply(200, videoResponse);

	nock('https://player.vimeo.com')
		.get('/video/110484775/config')
		.reply(200, videoConfigResponse);

	nock('https://api.vimeo.com')
		.get('/me/videos/12345')
		.reply(404);

	nock('https://player.vimeo.com')
		.get('/video/12345/config')
		.reply(404);
});

test.beforeEach(() => {
	bus = helpers.createBus();

	const client = provider.createClient({accessToken: 'foo'});

	videoHandler = provider.createVideoHandler(bus, getChannel, client, videoTransform);
});

test('when Vimeo video not found', t => {
	const spec = {
		channel: 'abc',
		type: 'videoSpec',
		id: 'spec-vimeo-/videos/12345',
		video: {uri: '/videos/12345'}
	};

	const obs = new Promise(resolve => {
		bus.observe({level: 'error'}, payload => {
			resolve(payload);
		});
	});

	t.throws(videoHandler({spec}), `Video not found for id "12345"`);

	return obs.then(event => {
		t.deepEqual(event.error, {code: 'VIDEO_NOT_FOUND'});
		t.is(event.code, 'VIDEO_NOT_FOUND');
		t.deepEqual(event.spec, spec);
		t.is(event.message, 'video not found');
	});
});

test('when Vimeo video found', t => {
	const spec = {
		channel: 'abc',
		type: 'videoSpec',
		id: `spec-vimeo-${videoResponse.uri}`,
		video: {uri: videoResponse.uri}
	};

	return videoHandler({spec})
		.then(res => {
			t.deepEqual(Object.keys(res), [
				'id',
				'type',
				'title',
				'description',
				'images',
				'sources',
				'duration',
				'releaseDate'
			]);
			t.is(res.id, `res-vimeo-${videoResponse.uri}`);
			t.is(res.type, 'video');
			t.is(res.title, videoResponse.name);
			t.is(res.description, videoResponse.description);
			t.is(res.images.length, videoResponse.pictures.sizes.length);
			t.is(res.images[0].url, videoResponse.pictures.sizes[0].link);
			t.is(res.sources.length, 3);
			t.is(res.sources[0].url, videoConfigResponse.request.files.hls.url);
			t.is(res.duration, 1000 * videoResponse.duration);
			t.is(res.releaseDate, (new Date(videoResponse.release_time)).toISOString());
		});
});

'use strict';

const test = require('ava');
const nock = require('nock');
const Promise = require('bluebird');

const provider = require('../');
const Client = require('../lib/client');
const videoTransform = require('../lib/default-video-transform');
const videoResponse = require('./fixtures/video-response');
const nonProVideoResponse = require('./fixtures/non-pro-video-response');
const helpers = require('./helpers');

const getChannel = () => {
	return Promise.resolve({id: 'abc'});
};

let bus;
let videoHandler = null;

test.before(() => {
	nock('https://api.vimeo.com')
		.get(`/me/videos/166971134?fields=${encodeURIComponent(Client.DEFAULT_VIDEO_FIELDS)}`)
		.reply(200, videoResponse);

	nock('https://api.vimeo.com')
		.get(`/me/videos/12345?fields=${encodeURIComponent(Client.DEFAULT_VIDEO_FIELDS)}`)
		.reply(404);

	nock('https://api.vimeo.com')
		.get(`/me/videos/108591077?fields=${encodeURIComponent(Client.DEFAULT_VIDEO_FIELDS)}`)
		.reply(200, nonProVideoResponse);
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
		id: 'spec-vimeo-video-12345',
		video: {uri: '/videos/12345'}
	};

	const obs = new Promise(resolve => {
		bus.observe({level: 'error'}, payload => {
			resolve(payload);
		});
	});

	return videoHandler({spec}).catch(err => {
		// test error condition
		t.is(err.message, `Video not found for uri "${spec.video.uri}"`);

		// test bus event
		return obs.then(event => {
			t.deepEqual(event.error, {code: 'VIDEO_NOT_FOUND'});
			t.is(event.code, 'VIDEO_NOT_FOUND');
			t.deepEqual(event.spec, spec);
			t.is(event.message, 'video not found');
		});
	});
});

test('when Vimeo video found', t => {
	const videoId = videoResponse.uri.split('/').pop();
	const spec = {
		channel: 'abc',
		type: 'videoSpec',
		id: `spec-vimeo-video-${videoId}`,
		video: {uri: videoResponse.uri}
	};

	return videoHandler({spec})
		.then(res => {
			const source1 = res.sources[0];
			const source4 = res.sources[3];

			t.deepEqual(Object.keys(res), [
				'id',
				'title',
				'description',
				'images',
				'sources',
				'duration',
				'releaseDate'
			]);
			t.is(res.id, `res-vimeo-video-${videoId}`);
			t.is(res.title, videoResponse.name);
			t.is(res.description, videoResponse.description);
			t.is(res.images.length, videoResponse.pictures.sizes.length);
			t.is(res.images[5].url, videoResponse.pictures.sizes[5].link);
			t.is(res.sources.length, 4);

			// sources (smallest SD)
			t.is(source1.url, videoResponse.files[0].link_secure);
			t.is(source1.label, `${videoResponse.files[0].quality}-${videoResponse.files[0].height}`);
			t.is(source1.mimeType, videoResponse.files[0].type);
			t.is(source1.width, videoResponse.files[0].width);
			t.is(source1.height, videoResponse.files[0].height);
			t.is(source1.container, videoResponse.files[0].type.split('/').pop());
			t.is(source1.maxBitrate, 0);
			// sources (HLS)
			t.is(source4.url, videoResponse.files[3].link_secure);
			t.is(source4.label, videoResponse.files[3].quality);
			t.is(source4.mimeType, 'application/x-mpegURL');
			t.is(source4.width, videoResponse.width);
			t.is(source4.height, videoResponse.height);
			t.is(source4.container, videoResponse.files[0].type.split('/').pop());
			t.is(source4.maxBitrate, 0);

			t.is(res.duration, 1000 * videoResponse.duration);
			t.is(res.releaseDate, (new Date(videoResponse.release_time)).toISOString());
		});
});

test('when video found from non pro/business account', t => {
	const videoId = nonProVideoResponse.uri.split('/').pop();

	const spec = {
		channel: 'abc',
		type: 'videoSpec',
		id: `spec-vimeo-video-${videoId}`,
		video: {uri: nonProVideoResponse.uri}
	};

	const obs = new Promise(resolve => {
		bus.observe({level: 'error'}, payload => {
			resolve(payload);
		});
	});

	return videoHandler({spec}).catch(err => {
		// test error condition
		t.is(err.message, 'Not a Vimeo Pro or Business account');

		// test bus event
		return obs.then(event => {
			t.deepEqual(event.error, {code: 'ACCOUNT_NOT_VALID'});
			t.is(event.code, 'ACCOUNT_NOT_VALID');
			t.deepEqual(event.spec, spec);
			t.is(event.message, 'account not valid');
		});
	});
});

'use strict';

const test = require('ava');
const nock = require('nock');
const Promise = require('bluebird');

const provider = require('../');
const albumTransform = require('../lib/default-collection-transform');
const albumResponse = require('./fixtures/album-response');
const albumResponseLarge = require('./fixtures/album-response-large');
const videosByAlbumResponse = require('./fixtures/videos-by-album-response');
const videosByAlbumResponsePage1 = require('./fixtures/videos-by-album-response-page-1');
const videosByAlbumResponsePage2 = require('./fixtures/videos-by-album-response-page-2');
const nonProAlbumResponse = require('./fixtures/non-pro-album-response');
const nonProVideosByAlbumResponse = require('./fixtures/non-pro-videos-by-album-response');
const helpers = require('./helpers');

const getChannel = () => {
	return Promise.resolve({id: 'abc'});
};

let bus;
let albumHandler = null;

test.before(() => {
	nock('https://api.vimeo.com')
		.get('/me/albums/4148058')
		.reply(200, albumResponse);

	nock('https://api.vimeo.com')
		.get('/me/albums/4148058/videos')
		.reply(200, videosByAlbumResponse);

	nock('https://api.vimeo.com')
		.get('/me/albums/12345')
		.reply(404);

	nock('https://api.vimeo.com')
		.get('/me/albums/3333333')
		.reply(200, albumResponseLarge);

	nock('https://api.vimeo.com')
		.get('/me/albums/3333333/videos?page=1')
		.reply(200, videosByAlbumResponsePage1);

	nock('https://api.vimeo.com')
		.get('/me/albums/3333333/videos?page=2')
		.reply(200, videosByAlbumResponsePage2);

	nock('https://api.vimeo.com')
		.get('/me/albums/3078903')
		.reply(200, nonProAlbumResponse);

	nock('https://api.vimeo.com')
		.get('/me/albums/3078903/videos')
		.reply(200, nonProVideosByAlbumResponse);
});

test.beforeEach(() => {
	bus = helpers.createBus();

	bus.commandHandler({role: 'catalog', cmd: 'setItemSpec'}, spec => {
		return Promise.resolve({type: 'videoSpec', resource: `res-vimeo-${spec.video.uri}`});
	});

	const client = provider.createClient({accessToken: 'foo'});

	albumHandler = provider.createAlbumHandler(bus, getChannel, client, albumTransform);
});

test.afterEach(() => {
	/* eslint-disable no-debugger */
	debugger;
	/* eslint-enable no-debugger */
});

test('when Vimeo album not found', t => {
	const spec = {
		channel: 'abc',
		type: 'collectionSpec',
		id: 'spec-vimeo-/users/32180226/albums/12345',
		album: {uri: '/users/32180226/albums/12345'}
	};

	const obs = new Promise(resolve => {
		bus.observe({level: 'error'}, payload => {
			resolve(payload);
		});
	});

	t.throws(albumHandler({spec}), `Album not found for uri "${spec.album.uri}"`);

	return obs.then(event => {
		t.deepEqual(event.error, {code: 'ALBUM_NOT_FOUND'});
		t.is(event.code, 'ALBUM_NOT_FOUND');
		t.deepEqual(event.spec, spec);
		t.is(event.message, 'album not found');
	});
});

test('when Vimeo album found', t => {
	const spec = {
		channel: 'abc',
		type: 'collectionSpec',
		id: `spec-vimeo-${albumResponse.uri}`,
		album: {uri: albumResponse.uri}
	};

	return albumHandler({spec})
		.then(res => {
			t.deepEqual(Object.keys(res), [
				'id',
				'type',
				'title',
				'description',
				'images',
				'relationships'
			]);
			t.is(res.id, `res-vimeo-${albumResponse.uri}`);
			t.is(res.type, 'collection');
			t.is(res.title, albumResponse.name);
			t.is(res.description, albumResponse.description);
			t.is(res.images.length, albumResponse.pictures.sizes.length);
			t.is(res.images[0].url, albumResponse.pictures.sizes[0].link);
			t.is(res.relationships.entities.data.length, videosByAlbumResponse.data.length);
			t.is(res.relationships.entities.data[0].id, `res-vimeo-${videosByAlbumResponse.data[0].uri}`);
		});
});

test('when Vimeo album with > 25 videos found', t => {
	const spec = {
		channel: 'abc',
		type: 'collectionSpec',
		id: `spec-vimeo-${albumResponseLarge.uri}`,
		album: {uri: albumResponseLarge.uri}
	};

	return albumHandler({spec})
		.then(res => {
			t.deepEqual(Object.keys(res), [
				'id',
				'type',
				'title',
				'description',
				'images',
				'relationships'
			]);
			t.is(res.id, `res-vimeo-${albumResponseLarge.uri}`);
			t.is(res.type, 'collection');
			t.is(res.title, albumResponseLarge.name);
			t.is(res.description, albumResponseLarge.description);
			t.is(res.images.length, 0);
			t.is(res.relationships.entities.data.length, (videosByAlbumResponsePage1.data.length + videosByAlbumResponsePage2.data.length));
			t.is(res.relationships.entities.data[39].id, `res-vimeo-${videosByAlbumResponsePage2.data[14].uri}`);
		});
});

test('when Vimeo album from non-Pro/Business account found', t => {
	const spec = {
		channel: 'abc',
		type: 'collectionSpec',
		id: `spec-vimeo-${nonProAlbumResponse.uri}`,
		album: {uri: nonProAlbumResponse.uri}
	};

	t.notThrows(albumHandler({spec}));
});

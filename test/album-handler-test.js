'use strict';

const test = require('ava');
const nock = require('nock');
const Promise = require('bluebird');

const provider = require('../');
const Client = require('../lib/client');
const albumTransform = require('../lib/default-collection-transform');
const albumResponse = require('./fixtures/album-response');
const albumResponseLarge = require('./fixtures/album-response-large');
const videosByAlbumResponse = require('./fixtures/videos-by-album-response');
const videosByAlbumResponsePage1 = require('./fixtures/videos-by-album-response-page-1');
const videosByAlbumResponsePage2 = require('./fixtures/videos-by-album-response-page-2');
const nonProAlbumResponse = require('./fixtures/non-pro-album-response');
const nonProVideosByAlbumResponse = require('./fixtures/non-pro-videos-by-album-response');
const helpers = require('./helpers');

const accessToken = '67832c5e-e2e6-4b3b-99bd-7b92a3863423';
const authHeader = `Bearer ${accessToken}`;

const getChannel = () => {
	return Promise.resolve({
		id: 'abc',
		secrets: {
			vimeo: {
				accessToken
			}
		}
	});
};

let bus;
let albumHandler = null;
const SPECS = [];

test.before(() => {
	nock(
		'https://api.vimeo.com',
		{
			reqheaders: {
				authorization: authHeader
			}
		})
		.get(`/me/albums/4148058?fields=${encodeURIComponent(Client.DEFAULT_ALBUM_FIELDS)}`)
		.reply(200, albumResponse);

	nock(
		'https://api.vimeo.com',
		{
			reqheaders: {
				authorization: authHeader
			}
		})
		.get(`/me/albums/4148058/videos?fields=${encodeURIComponent(Client.DEFAULT_VIDEO_FIELDS)}`)
		.reply(200, videosByAlbumResponse);

	nock(
		'https://api.vimeo.com',
		{
			reqheaders: {
				authorization: authHeader
			}
		})
		.get(`/me/albums/12345?fields=${encodeURIComponent(Client.DEFAULT_ALBUM_FIELDS)}`)
		.reply(404);

	nock(
		'https://api.vimeo.com',
		{
			reqheaders: {
				authorization: authHeader
			}
		})
		.get(`/me/albums/3333333?fields=${encodeURIComponent(Client.DEFAULT_ALBUM_FIELDS)}`)
		.reply(200, albumResponseLarge);

	nock(
		'https://api.vimeo.com',
		{
			reqheaders: {
				authorization: authHeader
			}
		})
		.get(`/me/albums/3333333/videos?fields=${encodeURIComponent(Client.DEFAULT_VIDEO_FIELDS)}&page=1`)
		.reply(200, videosByAlbumResponsePage1);

	nock(
		'https://api.vimeo.com',
		{
			reqheaders: {
				authorization: authHeader
			}
		})
		.get(`/me/albums/3333333/videos?fields=${encodeURIComponent(Client.DEFAULT_VIDEO_FIELDS)}&page=2`)
		.reply(200, videosByAlbumResponsePage2);

	nock(
		'https://api.vimeo.com',
		{
			reqheaders: {
				authorization: authHeader
			}
		})
		.get(`/me/albums/3078903?fields=${encodeURIComponent(Client.DEFAULT_ALBUM_FIELDS)}`)
		.reply(200, nonProAlbumResponse);

	nock(
		'https://api.vimeo.com',
		{
			reqheaders: {
				authorization: authHeader
			}
		})
		.get(`/me/albums/3078903/videos?fields=${encodeURIComponent(Client.DEFAULT_VIDEO_FIELDS)}`)
		.reply(200, nonProVideosByAlbumResponse);
});

test.beforeEach(() => {
	SPECS.splice(0, SPECS.length);
	bus = helpers.createBus();

	bus.commandHandler({role: 'catalog', cmd: 'setItemSpec'}, spec => {
		SPECS.push(spec);
		const videoId = spec.video.uri.split('/').pop();
		return Promise.resolve({type: 'videoSpec', resource: `res-vimeo-video-${videoId}`});
	});

	const client = provider.createClient({accessToken: 'foo'});

	albumHandler = provider.createAlbumHandler(bus, getChannel, client, albumTransform);
});

test('when Vimeo album not found', t => {
	const spec = {
		channel: 'abc',
		type: 'collectionSpec',
		id: 'spec-vimeo-album-12345',
		album: {uri: '/users/32180226/albums/12345'}
	};

	const obs = new Promise(resolve => {
		bus.observe({level: 'error'}, payload => {
			resolve(payload);
		});
	});

	return albumHandler({spec}).catch(err => {
		// test error condition
		t.is(err.message, `Album not found for uri "${spec.album.uri}"`);

		// test bus event
		return obs.then(event => {
			t.deepEqual(event.error, {code: 'ALBUM_NOT_FOUND'});
			t.is(event.code, 'ALBUM_NOT_FOUND');
			t.deepEqual(event.spec, spec);
			t.is(event.message, 'album not found');
		});
	});
});

test('when Vimeo album found', t => {
	const albumId = albumResponse.uri.split('/').pop();
	const spec = {
		channel: 'abc',
		type: 'collectionSpec',
		id: `spec-vimeo-album-${albumId}`,
		album: {uri: albumResponse.uri}
	};

	return albumHandler({spec})
		.then(res => {
			t.deepEqual(Object.keys(res), [
				'id',
				'title',
				'description',
				'images',
				'relationships'
			]);
			t.is(res.id, `res-vimeo-album-${albumId}`);
			t.is(res.title, albumResponse.name);
			t.is(res.description, albumResponse.description);
			t.is(res.images.length, albumResponse.pictures.sizes.length);
			t.is(res.images[0].url, albumResponse.pictures.sizes[0].link);
			t.is(res.relationships.entities.data.length, videosByAlbumResponse.data.length);
			const videoId = videosByAlbumResponse.data[0].uri.split('/').pop();
			t.is(res.relationships.entities.data[0].id, `res-vimeo-video-${videoId}`);
			const specIds = SPECS.map(spec => {
				return spec.id;
			});
			res.relationships.entities.data.forEach(identifier => {
				const id = identifier.id.split('-').pop();
				t.true(specIds.indexOf(`spec-vimeo-video-${id}`) > -1);
			});
		});
});

test('when Vimeo album with > 25 videos found', t => {
	const albumId = albumResponseLarge.uri.split('/').pop();
	const spec = {
		channel: 'abc',
		type: 'collectionSpec',
		id: `spec-vimeo-album-${albumId}`,
		album: {uri: albumResponseLarge.uri}
	};

	return albumHandler({spec})
		.then(res => {
			t.deepEqual(Object.keys(res), [
				'id',
				'title',
				'description',
				'images',
				'relationships'
			]);

			t.is(res.id, `res-vimeo-album-${albumId}`);
			t.is(res.title, albumResponseLarge.name);
			t.is(res.description, albumResponseLarge.description);
			t.is(res.images.length, 0);
			t.is(res.relationships.entities.data.length, (videosByAlbumResponsePage1.data.length + videosByAlbumResponsePage2.data.length));
			const videoId = videosByAlbumResponsePage2.data[14].uri.split('/').pop();
			t.is(res.relationships.entities.data[39].id, `res-vimeo-video-${videoId}`);
			const specIds = SPECS.map(spec => {
				return spec.id;
			});
			res.relationships.entities.data.forEach(identifier => {
				const id = identifier.id.split('-').pop();
				t.true(specIds.indexOf(`spec-vimeo-video-${id}`) > -1);
			});
		});
});

test('when Vimeo album from non-Pro/Business account found', t => {
	const albumId = nonProAlbumResponse.uri.split('/').pop();
	const spec = {
		channel: 'abc',
		type: 'collectionSpec',
		id: `spec-vimeo-album-${albumId}`,
		album: {uri: nonProAlbumResponse.uri}
	};

	t.notThrows(albumHandler({spec}));
});

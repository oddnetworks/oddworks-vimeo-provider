'use strict';

const test = require('ava');
const sinon = require('sinon');

const provider = require('../');
const defaultVideoTransform = require('../lib/default-video-transform');
const defaultCollectionTransform = require('../lib/default-collection-transform');
const helpers = require('./helpers');

let bus;
let result = null;

let createVideoHandlerSpy;
let createAlbumHandlerSpy;
let queryHandlerSpy;

function videoHandler() {}
function albumHandler() {}

test.before(() => {
	bus = helpers.createBus();

	createVideoHandlerSpy = sinon.stub(provider, 'createVideoHandler').returns(videoHandler);
	createAlbumHandlerSpy = sinon.stub(provider, 'createAlbumHandler').returns(albumHandler);
	queryHandlerSpy = sinon.spy(bus, 'queryHandler');

	const options = {
		bus,
		accessToken: 'foo'
	};

	return provider.initialize(options).then(res => {
		result = res;
		return null;
	});
});

test('creates Vimeo client', t => {
	t.plan(2);

	t.truthy(result.client);
	t.is(result.client.accessToken, 'foo');
});

test('calls createVideoHandler', t => {
	t.plan(2);

	t.true(createVideoHandlerSpy.calledOnce);
	t.true(createVideoHandlerSpy.calledWith(bus, sinon.match.func, result.client, defaultVideoTransform));
});

test('calls createAlbumHandler', t => {
	t.plan(2);

	t.true(createAlbumHandlerSpy.calledOnce);
	t.true(createAlbumHandlerSpy.calledWith(bus, sinon.match.func, result.client, defaultCollectionTransform));
});

test('calls bus.queryHandler', t => {
	t.plan(3);

	t.true(queryHandlerSpy.calledTwice);
	t.deepEqual(queryHandlerSpy.firstCall.args, [
		{role: 'provider', cmd: 'get', source: 'vimeo-album'},
		albumHandler
	]);
	t.deepEqual(queryHandlerSpy.secondCall.args, [
		{role: 'provider', cmd: 'get', source: 'vimeo-video'},
		videoHandler
	]);
});

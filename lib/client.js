'use strict';

const Promise = require('bluebird');
const Boom = require('boom');
const request = require('request');
const debug = require('debug')('oddworks:provider:vimeo:client');

const util = require('./util');

const MINUTE = 1000 * 60;

class Client {

	// spec.bus *optional
	// spec.accessToken *required
	constructor(spec) {
		this.bus = spec.bus || null;

		this.accessToken = spec.accessToken;
		this.rateLimitBlocked = false;

		this.getAlbums = this.getAlbums.bind(this);
		this.getAlbum = this.getAlbum.bind(this);
		this.getVideosByAlbum = this.getVideosByAlbum.bind(this);
		this.getVideos = this.getVideos.bind(this);
		this.getVideo = this.getVideo.bind(this);
	}

	formatId(uri) {
		return util.formatId(uri);
	}

	sendBusEvent(pattern, event) {
		if (this.bus) {
			this.bus.broadcast(pattern, event);
		}
	}

	// args.query *optional - See: https://developer.vimeo.com/api/endpoints/me#GET/me/albums
	// args.query.fields *optional - Defaults to Client.DEFAULT_ALBUM_FIELDS
	getAlbums(args) {
		args = args || {};
		args.path = '/me/albums';

		debug(`getAlbums path: ${args.path}`);
		const fields = Client.DEFAULT_ALBUM_FIELDS;
		args.query = Object.assign({}, {fields}, args.query);

		return this.makeRequest(args);
	}

	// args.albumId *required
	// args.query *optional - See: https://developer.vimeo.com/api/endpoints/me#GET/me/albums/{album_id}
	// args.query.fields *optional - Defaults to Client.DEFAULT_ALBUM_FIELDS
	getAlbum(args) {
		args = args || {};
		const albumId = this.formatId(args.albumUri);

		if (!albumId || typeof albumId !== 'string') {
			throw new Error('An albumUri is required to getAlbum()');
		}

		args.path = `/me/albums/${albumId}`;

		debug(`getAlbum uri: #{args.albumUri} path: ${args.path}`);
		const fields = Client.DEFAULT_ALBUM_FIELDS;
		args.query = Object.assign({}, {fields}, args.query);

		return this.makeRequest(args);
	}

	// args.albumId *required
	// args.query *optional - See: https://developer.vimeo.com/api/endpoints/me#GET/me/albums/{album_id}/videos
	// args.query.fields *optional - Defaults to Client.DEFAULT_VIDEO_FIELDS
	getVideosByAlbum(args) {
		args = args || {};
		const albumId = this.formatId(args.albumUri);

		if (!albumId || typeof albumId !== 'string') {
			throw new Error('An albumUri is required to getVideosByAlbum()');
		}

		args.path = `/me/albums/${albumId}/videos`;
		const fields = Client.DEFAULT_VIDEO_FIELDS;
		args.query = Object.assign({}, {fields}, args.query);

		debug(`getVideosByAlbum uri: ${args.albumUri} path: ${args.path}`);

		return this.makeRequest(args);
	}

	// args.query *optional - See: https://developer.vimeo.com/api/endpoints/me#GET/me/videos
	// args.query.fields *optional - Defaults to Client.DEFAULT_VIDEO_FIELDS
	getVideos(args) {
		args = args || {};
		args.path = '/me/videos';

		debug(`getVideos path: ${args.path}`);
		const fields = Client.DEFAULT_VIDEO_FIELDS;
		args.query = Object.assign({}, {fields}, args.query);

		return this.makeRequest(args);
	}

	// args.videoId *required
	// args.query *optional - See: https://developer.vimeo.com/api/endpoints/me#GET/me/videos/{video_id}
	// args.query.fields *optional - Defaults to Client.DEFAULT_VIDEO_FIELDS
	getVideo(args) {
		args = args || {};
		const videoId = this.formatId(args.videoUri);

		if (!videoId || typeof videoId !== 'string') {
			throw new Error('A videoUri is required to getVideo()');
		}

		args.path = `/me/videos/${videoId}`;
		const fields = Client.DEFAULT_VIDEO_FIELDS;
		args.query = Object.assign({}, {fields}, args.query);

		debug(`getVideo uri: ${args.videoUri} path: ${args.path}`);

		return this.makeRequest(args);
	}

	// args.path *required
	// args.accessToken *required
	makeRequest(args) {
		// If we've had a request rejected because of rate limiting, we block here
		// until our blocker has been lifted after a timeout.
		if (this.rateLimitBlocked) {
			this.sendBusEvent(
				{level: 'warn'},
				{message: 'attempted a request while vimeo rate limit blocking in effect'}
			);

			return Promise.reject(new Error(
				`Request for ${args.path} has been blocked by the Oddworks Vimeo client for rate limiting`
			));
		}

		const method = 'GET';
		const path = args.path;

		const baseUrl = args.baseUrl || Client.API_BASE_URL;

		const accessToken = args.accessToken || this.accessToken;

		if (!accessToken || typeof accessToken !== 'string') {
			throw new Error('An accessToken is required to makeRequest()');
		}
		if (!path || typeof path !== 'string') {
			throw new Error('A path is required to makeRequest()');
		}

		const headers = {
			Authorization: `Bearer ${accessToken}`
		};
		const qs = Object.assign({}, args.query);
		const url = `${baseUrl}${path}`;

		debug(`makeRequest method: ${method} url: ${url} qs: ${JSON.stringify(qs)}`);

		return Client.request({method, url, qs, headers}).catch(err => {
			if (err.code === 'VIMEO_RATE_LIMIT') {
				this.setRateLimitBlocker();
			}

			return Promise.reject(err);
		});
	}

	setRateLimitBlocker() {
		this.rateLimitBlocked = true;
		setTimeout(() => {
			this.rateLimitBlocked = false;
			this.sendBusEvent({level: 'info'}, {message: 'Vimeo rate limit block has been lifted'});
		}, MINUTE * 20);
	}

	static get API_BASE_URL() {
		return 'https://api.vimeo.com';
	}

	static get VIMEO_CONTENT_TYPE_MATCHER() {
		return /^application\/(vnd\.vimeo\.\w+\+)?json/;
	}

	static get DEFAULT_VIDEO_FIELDS() {
		return 'uri,name,description,files,pictures,duration,release_time,width,height';
	}

	static get DEFAULT_ALBUM_FIELDS() {
		return 'uri,name,description,pictures,metadata.connections.videos.total';
	}

	static request(params) {
		return new Promise((resolve, reject) => {
			request(params, (err, res, body) => {
				if (err) {
					debug(`Client.request error: ${err}`);
					return reject(err);
				}

				if (res.statusCode === 404) {
					debug(`Client.request status: 404`);
					return resolve(null);
				}

				const isJson = Client.VIMEO_CONTENT_TYPE_MATCHER.test(res.headers['content-type']);

				if (isJson && typeof body === 'string') {
					try {
						body = JSON.parse(body);
					} catch (err) {
						debug(`Client.request error: JSON parsing error: ${err.message}`);
						return reject(new Error(
							`vimeo client JSON parsing error: ${err.message}`
						));
					}
				} else if (isJson) {
					debug(`Client.request error: received an empty json body`);
					return reject(new Error(
						`vimeo client received an empty json body`
					));
				} else if (res.statusCode === 429) {
					debug(`vimeo has rate limited this application`);
					const err = new Error(`vimeo has rate limited this application`);
					err.code = 'VIMEO_RATE_LIMIT';
					return reject(err);
				} else {
					debug(`Client.request error: expects content-type to be application/*json`);
					return reject(new Error(
						`vimeo client expects content-type to be application/*json`
					));
				}

				if (res.statusCode !== 200) {
					debug(`Client.request status: ${res.statusCode} error: ${body.error} developer_message: ${body.developer_message}`);
					return reject(Boom.create(res.statusCode, res.statusMessage, body));
				}

				return resolve(body);
			});
		});
	}
}

module.exports = Client;

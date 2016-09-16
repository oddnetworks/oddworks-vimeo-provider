'use strict';

const Boom = require('boom');
const request = require('request');
const debug = require('debug')('oddworks:provider:vimeo:client');

class Client {

	// spec.bus *optional
	// spec.accessToken *required
	constructor(spec) {
		this.bus = spec.bus || null;

		this.accessToken = spec.accessToken;

		this.getAlbums = this.getAlbums.bind(this);
		this.getAlbum = this.getAlbum.bind(this);
		this.getVideosByAlbum = this.getVideosByAlbum.bind(this);
		this.getVideos = this.getVideos.bind(this);
		this.getVideo = this.getVideo.bind(this);
		this.getVideoConfig = this.getVideoConfig.bind(this);
	}

	fetchId(uri) {
		if (!uri || typeof uri !== 'string') {
			return null;
		}

		return uri.split('/').pop();
	}

	getAlbums(args) {
		args = args || {};
		args.path = '/me/albums';

		debug(`getAlbums path: ${args.path}`);

		return this.makeRequest(args);
	}

	getAlbum(args) {
		args = args || {};
		const albumId = this.fetchId(args.albumUri);

		if (!albumId || typeof albumId !== 'string') {
			throw new Error('An albumUri is required to getAlbum()');
		}

		args.path = `/me/albums/${albumId}`;

		debug(`getAlbum uri: #{args.albumUri} path: ${args.path}`);

		return this.makeRequest(args);
	}

	getVideosByAlbum(args) {
		args = args || {};
		const albumId = this.fetchId(args.albumUri);

		if (!albumId || typeof albumId !== 'string') {
			throw new Error('An albumUri is required to getVideosByAlbum()');
		}

		args.path = `/me/albums/${albumId}/videos`;

		debug(`getVideosByAlbum uri: ${args.albumUri} path: ${args.path}`);

		return this.makeRequest(args);
	}

	getVideos(args) {
		args = args || {};
		args.path = '/me/videos';

		debug(`getVideos path: ${args.path}`);

		return this.makeRequest(args);
	}

	getVideo(args) {
		args = args || {};
		const videoId = this.fetchId(args.videoUri);

		if (!videoId || typeof videoId !== 'string') {
			throw new Error('A videoUri is required to getVideo()');
		}

		args.path = `/me/videos/${videoId}`;

		debug(`getVideo uri: ${args.videoUri} path: ${args.path}`);

		return this.makeRequest(args);
	}

	getVideoConfig(args) {
		args = args || {};
		const videoId = this.fetchId(args.videoUri);

		if (!videoId || typeof videoId !== 'string') {
			throw new Error('A videoUri is required to getVideoConfig()');
		}

		args.baseUrl = Client.VIDEO_API_BASE_URL;
		args.path = `/video/${videoId}/config`;

		debug(`getVideoConfig uri: ${args.videoUri} path: ${args.path}`);

		return this.makeRequest(args);
	}

	// args.path *required
	// args.accessToken *required
	makeRequest(args) {
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

		return Client.request({method, url, qs, headers});
	}

	static get API_BASE_URL() {
		return 'https://api.vimeo.com';
	}

	static get VIDEO_API_BASE_URL() {
		return 'https://player.vimeo.com';
	}

	static get VIMEO_CONTENT_TYPE_MATCHER() {
		return /^application\/(vnd\.vimeo\.\w+\+)?json/;
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

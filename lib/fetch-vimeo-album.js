'use strict';

const Promise = require('bluebird');
const debug = require('debug')('oddworks:provider:vimeo:fetch-vimeo-album');

const PER_PAGE = 25;

module.exports = (bus, client, transform) => {
	return args => {
		const channel = args.channel;
		const secrets = channel.secrets || {};
		const spec = args.spec;
		let collection = args.collection;
		const albumUri = args.albumUri;

		const creds = Object.create(null);
		if (secrets.vimeo && secrets.vimeo.accessToken) {
			creds.accessToken = secrets.vimeo.accessToken;
		}

		const params = Object.assign({albumUri}, creds);
		return client.getAlbum(params)
			.then(album => {
				if (album) {
					collection = Object.assign({}, collection, transform(spec, album));

					const total = album.metadata.connections.videos.total;

					if (total > PER_PAGE) {
						const promises = [];

						const pages = Math.ceil(total / PER_PAGE);
						debug(`fetchVimeoAlbum total videos: ${total} total pages: ${pages}`);
						let requests = 1;
						while (requests <= pages) {
							const query = {
								page: requests
							};
							debug(`uri: ${albumUri} query: ${JSON.stringify(query)}`);
							promises.push(
								client.getVideosByAlbum(Object.assign({albumUri, query}, creds))
									.then(res => {
										return res.data;
									})
							);
							requests++;
						}

						return Promise.all(promises)
							.then(results => {
								return results.reduce((a, b) => {
									return a.concat(b);
								});
							});
					}

					debug(`fetchVimeoAlbum total videos: ${total} total pages: 1`);
					debug(`uri: ${albumUri} query: {}`);
					return client
						.getVideosByAlbum(Object.assign({albumUri}, creds))
						.then(res => {
							return res.data;
						});
				}

				const error = new Error(`Album not found for uri "${albumUri}"`);
				error.code = 'ALBUM_NOT_FOUND';

				// report the ALBUM_NOT_FOUND error.
				bus.broadcast({level: 'error'}, {
					spec,
					error,
					code: error.code,
					message: 'album not found'
				});

				// Return a rejection to short circuit the rest of the operation
				return Promise.reject(error);
			})
			.then(videos => {
				if (videos && videos.length) {
					return Promise.all(videos.map(video => {
						const spec = {
							channel: channel.id,
							type: 'videoSpec',
							source: 'vimeo-video',
							video
						};

						if (video.uri) {
							spec.id = `spec-vimeo-video-${client.formatId(video.uri)}`;
						}

						return bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, spec);
					}));
				}

				return [];
			})
			.then(specs => {
				collection.relationships = collection.relationships || {};

				collection.relationships.entities = {
					data: specs.map(spec => {
						return {
							id: spec.resource,
							type: spec.type.replace(/Spec$/, '')
						};
					})
				};

				return collection;
			});
	};
};

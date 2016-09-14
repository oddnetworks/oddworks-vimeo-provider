'use strict';

const Promise = require('bluebird');

module.exports = (bus, client, transform) => {
	return args => {
		const channel = args.channel;
		const secrets = channel.secrets || {};
		const spec = args.spec;
		let collection = args.collection;
		const albumUri = args.albumUri;

		const creds = Object.create(null);
		if (secrets.vimeoAccessToken) {
			creds.accessToken = secrets.vimeoAccessToken;
		}

		const params = Object.assign({albumUri}, creds);
		return client.getAlbum(params)
			.then(album => {
				if (album) {
					collection = Object.assign({}, collection, transform(spec, album));

					return client.getVideosByAlbum(Object.assign({albumUri}, creds));
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
				if (videos && videos.data && videos.data.length) {
					return Promise.all(videos.data.map(video => {
						const spec = {
							channel: channel.id,
							type: 'videoSpec',
							source: 'vimeo-video',
							video
						};

						if (video.uri) {
							spec.id = `spec-video-${video.uri}`;
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

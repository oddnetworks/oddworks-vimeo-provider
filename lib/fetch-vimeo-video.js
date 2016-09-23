'use strict';

const Promise = require('bluebird');

module.exports = (bus, client, transform) => {
	return args => {
		const channel = args.channel;
		const secrets = channel.secrets || {};
		const spec = args.spec;
		const videoUri = args.videoUri;

		const creds = Object.create(null);
		if (secrets.vimeo && secrets.vimeo.accessToken) {
			creds.accessToken = secrets.vimeo.accessToken;
		}

		const params = Object.assign({videoUri}, creds);
		return client.getVideo(params).then(video => {
			if (video && video.files) {
				return transform(spec, video);
			} else if (video && !video.files) {
				const error = new Error(`Not a Vimeo Pro or Business account`);
				error.code = 'ACCOUNT_NOT_VALID';

				bus.broadcast({level: 'error'}, {
					spec,
					error,
					code: error.code,
					message: 'account not valid'
				});

				return Promise.reject(error);
			}

			const error = new Error(`Video not found for uri "${videoUri}"`);
			error.code = 'VIDEO_NOT_FOUND';

			bus.broadcast({level: 'error'}, {
				spec,
				error,
				code: error.code,
				message: 'video not found'
			});

			return Promise.reject(error);
		});
	};
};

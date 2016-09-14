'use strict';

const formatSources = videoConfig => {
	const video = videoConfig.video;
	const hls = videoConfig.request.files.hls;
	const progressive = videoConfig.request.files.progressive;
	const sources = [];

	if (hls && typeof hls === 'object') {
		sources.push(Object.assign({}, {
			url: hls.url,
			container: 'hls',
			mimeType: 'application/x-mpegURL',
			height: video.height,
			width: video.width,
			maxBitrate: 0,
			label: 'hls'
		}));
	}

	if (progressive && Array.isArray(progressive)) {
		progressive.forEach(source => {
			sources.push(Object.assign({}, {
				url: source.url,
				container: 'mp4',
				mimeType: source.mime,
				height: source.height,
				width: source.width,
				maxBitrate: 0,
				label: source.quality
			}));
		});
	}

	return sources;
};

const formatReleaseDate = releaseTime => {
	const releaseDate = new Date(releaseTime);

	return releaseDate.toISOString();
};

module.exports = (spec, video, videoConfig) => {
	return {
		id: `res-vimeo-${video.uri}`,
		type: 'video',
		title: video.name,
		description: video.description,
		images: video.pictures.sizes.map(image => {
			return Object.assign({}, {
				label: `${image.width}`,
				width: image.width,
				height: image.height,
				url: image.link
			});
		}),
		sources: formatSources(videoConfig),
		duration: video.duration * 1000,
		releaseDate: formatReleaseDate(video.release_time)
	};
};

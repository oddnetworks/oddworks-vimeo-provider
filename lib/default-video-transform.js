'use strict';

const formatImages = video => {
	return video.pictures.sizes.map(image => {
		return {
			url: image.link,
			width: image.width,
			height: image.height,
			label: `${image.width}x${image.height}`
		};
	});
};

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
		title: video.name,
		description: video.description,
		images: formatImages(video),
		sources: formatSources(videoConfig),
		duration: video.duration * 1000,
		releaseDate: formatReleaseDate(video.release_time)
	};
};

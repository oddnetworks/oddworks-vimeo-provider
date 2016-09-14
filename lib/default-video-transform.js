'use strict';

const formatSources = videoConfig => {
	const video = videoConfig.video;
	const hlsUrl = videoConfig.request.files.hls.url;
	const progressive = videoConfig.request.files.progressive.sort((a, b) => {
		return b.width - a.width;
	});
	const sources = [];

	sources.push(Object.assign({}, {
		url: hlsUrl,
		container: 'hls',
		mimeType: 'application/x-mpegURL',
		height: video.height,
		width: video.width,
		maxBitrate: 0,
		label: 'hls'
	}));

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

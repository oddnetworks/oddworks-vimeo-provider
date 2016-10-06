'use strict';

const util = require('./util');

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

const formatSources = video => {
	return video.files.map(file => {
		const container = file.type.split('/').pop();
		let mimeType = file.type;
		if (file.quality === 'hls') {
			mimeType = 'application/x-mpegURL';
		}
		let label = file.quality;
		if (label !== 'hls') {
			label = `${label}-${file.height}`;
		}

		return {
			url: file.link_secure,
			container,
			mimeType,
			height: file.height || video.height,
			width: file.width || video.width,
			maxBitrate: 0,
			label
		};
	});
};

const formatReleaseDate = releaseTime => {
	const releaseDate = new Date(releaseTime);

	return releaseDate.toISOString();
};

module.exports = (spec, video) => {
	return {
		id: `res-vimeo-video-${util.formatId(video.uri)}`,
		title: video.name,
		description: video.description,
		images: formatImages(video),
		sources: formatSources(video),
		duration: video.duration * 1000,
		releaseDate: formatReleaseDate(video.release_time)
	};
};

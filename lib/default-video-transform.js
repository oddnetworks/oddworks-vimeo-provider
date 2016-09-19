'use strict';

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
		sources: formatSources(video),
		duration: video.duration * 1000,
		releaseDate: formatReleaseDate(video.release_time)
	};
};

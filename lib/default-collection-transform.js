'use strict';

const formatImages = pictures => {
	if (!pictures || typeof pictures !== 'object' || !Array.isArray(pictures.sizes)) {
		return [];
	}

	return pictures.sizes.map(image => {
		return {
			url: image.link,
			width: image.width,
			height: image.height,
			label: `${image.width}x${image.height}`
		};
	});
};

module.exports = (spec, album) => {
	return {
		id: `res-vimeo-${album.uri}`,
		title: album.name,
		description: album.description,
		images: formatImages(album.pictures)
	};
};

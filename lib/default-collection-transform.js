'use strict';

const fetchCollectionImages = pictures => {
	if (!pictures || typeof pictures !== 'object' || !Array.isArray(pictures.sizes)) {
		return [];
	}

	return pictures.sizes.map(image => {
		return Object.assign({}, {
			width: image.width,
			height: image.height,
			url: image.link
		});
	});
};

module.exports = (spec, album) => {
	return {
		id: `res-vimeo-${album.uri}`,
		type: 'collection',
		title: album.name,
		description: album.description,
		images: fetchCollectionImages(album.pictures)
	};
};

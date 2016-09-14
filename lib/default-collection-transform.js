'use strict';

module.exports = (spec, album) => {
	return {
		id: `res-vimeo-${album.uri}`,
		type: 'collection',
		title: album.name,
		description: album.description,
		images: album.pictures.sizes.map(image => {
			return Object.assign({}, {
				width: image.width,
				height: image.height,
				url: image.link
			});
		})
	};
};

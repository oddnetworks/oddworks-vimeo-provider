'use strict';

module.exports = (spec, album) => {
	return Object.assign({}, spec, album, {
		title: album.name,
		description: album.name,
		images: album.pictures.sizes.map(image => {
			return Object.assign({}, {
				width: image.width,
				height: image.height,
				url: image.link
			});
		})
	});
};

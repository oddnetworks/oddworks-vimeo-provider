'use strict';

exports.formatId = (uri, channelId) => {
	if (!uri || typeof uri !== 'string') {
		return null;
	}

	// Remove first and last "/" if thare are any
	const parts = uri.replace(/^[/]+/, '').replace(/[/]+$/, '').split('/');
	if (channelId) {
		parts.unshift(channelId);
	}

	return parts.join('-');
};

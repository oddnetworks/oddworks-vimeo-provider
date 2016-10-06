'use strict';

const debug = require('debug')('oddworks:provider:vimeo:util');

exports.formatId = uri => {
	if (!uri || typeof uri !== 'string') {
		return null;
	}

	const id = uri.split('/').pop();

	debug(`id: ${id} uri: ${uri}`);

	return id;
};

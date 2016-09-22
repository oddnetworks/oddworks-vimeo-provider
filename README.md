# Oddworks Vimeo Provider

A Vimeo provider plugin for the Oddworks content server.

Installation
------------
Install the npm package as a Node.js library:

    npm install --save oddworks-vimeo-provider

For full Vimeo API documentation see [developer.vimeo.com/api](https://developer.vimeo.com/api).

Oddworks Server Integration
---------------------------
The Oddworks-Vimeo provider is designed to be integrated with an Oddworks server [catalog](https://github.com/oddnetworks/oddworks/tree/master/lib/services/catalog), specifically as a [provider](https://github.com/oddnetworks/oddworks/tree/master/lib/services/catalog#providers). To initialize the plugin in your server:

```JavaScript
const vimeoProvider = require('oddworks-vimeo-provider');

// See https://github.com/oddnetworks/oddworks/tree/master/lib/services/catalog#patterns
// for more information regarding an Oddcast Bus.
const bus = createMyOddcastBus();

const options = {
    bus: bus,
    accessToken: process.env.VIMEO_ACCESS_TOKEN
};

vimeoProvider.initialize(options).then(provider => {
    console.log('Initialized provider "%s"', provider.name);
}).catch(err => {
    console.error(err.stack || err.message || err);
});
```

The initialization process will attach Oddcast listeners for the following queries:

- `bus.query({role: 'provider', cmd: 'get', source: 'vimeo-video'})`
- `bus.query({role: 'provider', cmd: 'get', source: 'vimeo-album'})`

To use them you send Oddcast commands to save a specification object:

```JavaScript
// To create a collection based on a Vimeo album:
bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, {
    channel: 'abc',
    type: 'collectionSpec',
    source: 'vimeo-album',
    album: {uri: '/users/12345/albums/678901'}
});

// To create a video based on a Vimeo video:
bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, {
    channel: 'abc',
    type: 'videoSpec',
    source: 'vimeo-video',
    video: {uri: '/videos/1234567'}
});
```

#### Transform Functions
This library provides a default transform function for collections and assets. It is fine to use the default, but you can provide your own like this:

```JavaScript
const vimeoProvider = require('oddworks-vimeo-provider');
const bus = createMyOddcastBus();

const options = {
    bus: bus,
    collectionTransform: myCollectionTransform,
    videoTransform: myVideoTransform
};

vimeoProvider.initialize(options).then(provider => {
    console.log('Initialized provider "%s"', provider.name);
}).catch(err => {
    console.error(err.stack || err.message || err);
});
```

Your transform functions `myCollectionTransform` and `myVideoTransform` will be called when the `vimeo-collection` and `vimeo-video` have respectively received a response from the Vimeo API.

The `myCollectionTransform` and `myVideoTransform` functions will each be called with 2 arguments: The spec object and the Vimeo API response object for an album or video, respectively.

See `lib/default-collection-transform` and `lib/default-video-transform` for more info.

Vimeo API Client
-----------------
You can create a stand-alone API client outside of the Oddworks provider:

```JavaScript
const vimeoProvider = require('oddworks-vimeo-provider');

const client = vimeoProvider.createClient({
    bus: bus,
    accessToken: process.env.VIMEO_ACCESS_TOKEN
});
```

### Client Methods
All methods return a Promise.

- `client.getAlbums()` - [developer.vimeo.com/api/endpoints/me#/albums](https://developer.vimeo.com/api/endpoints/me#/albums)
- `client.getAlbum({albumUri})`
- `client.getVideosByAlbum({albumUri})`
- `client.getVideos()` - [developer.vimeo.com/api/endpoints/me#/videos](https://developer.vimeo.com/api/endpoints/me#/videos)
- `client.getVideo({videoUri})`

### Query Strings

All methods support query strings. Simply provide the `{query}` key a hash of the query strings to use. This is handy for certain endpoints like list endpoints.

List endpoints such as `client.getAlbums()`, `client.getVideosByAlbum({albumUri})`, or `client.getVideos()` are pageable. The default number of items per page is `25` and the max number of items per-page is `50`. If your account contains more than 25 videos or albums, or your album contains more than 25 videos, you will need to pass `query` params in order to fetch the rest of your data.

Example:

```JavaScript
const albumId = '12345';
const query = {
  page: 2,
  per_page: 25
};

client
  .getVideosByAlbum({albumId, query})
  .then(res => {
    console.log(JSON.stringify(res, null, 2));
  });
```

Command Line Interface
----------------------
You can interact with the Vimeo client using the CLI tool. To get started, run:

    bin/vimeo --help

To authenticate the API you'll need to export the following environment variables:

- `VIMEO_ACCESS_TOKEN` The Vimeo API access token

To get help with commands:

    bin/vimeo list --help
    bin/vimeo req --help

License
-------
Apache 2.0 © [Odd Networks](http://oddnetworks.com)

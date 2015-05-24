# node-ember-cli-deploy-redis [![Build Status](https://travis-ci.org/blimmer/node-ember-cli-deploy-redis.svg?branch=master)](https://travis-ci.org/blimmer/node-ember-cli-deploy-redis)

Helper method to fetch the current (or specified) revision of your Ember App deployed by [ember-cli-deploy](https://github.com/ember-cli/ember-cli-deploy).

## Why?
[ember-cli-deploy](https://github.com/ember-cli/ember-cli-deploy) is great. It allows you to run
multiple versions in production at the same time and view revisions without impacting users.
However, [the example provided](https://github.com/philipheinser/ember-lightning) uses [koa](http://koajs.com/)
and many of us are not. This package allows you to easily fetch current and specified `index.html`
revisions from [redis](http://redis.io) with [Express](expressjs.com) and other Node servers.

## Usage
1. `require` the package
2. Use the `fetchIndex` method
3. Render the index string as you wish.

## Example
```javascript
var express = require('express');
var app = express();

var redis = require('redis');
var client = redis.createClient(/*your connection info*/);

var EMBER_APP_NAME = 'my-ember-app';
var emberDeployHelper = require('node-ember-cli-deploy-redis');

app.get('/', function(req, res) {
    emberDeployHelper.fetchIndex(EMBER_APP_NAME, req, client).then(function (indexHtml) {
    res.status(200).send(indexHtml);
  }).catch(function(err) {
    res.status(500).send('Oh noes!\n' + err.message);
  });
});
```
Check out [location-aware-ember-server](https://github.com/blimmer/location-aware-ember-server) for a running example.

## Documentation
### `fetchIndex(appName, request, redisClient, options)`
Arguments
* appName (required) - the application name, specified for ember deploy  
   the keys in redis are prefaced with this name, e.g. `my-app:current`
* request (required) - the request object  
   the request object is used to check for the presence of `revisionQueryParam`
* redisClient (required) - an instantiated [node_redis](https://github.com/mranney/node_redis) client
   if your site handles a lot of requests, it might make sense to use the [memoize](https://github.com/medikoo/memoize) package with this to defer some load.
* options (optional) - a hash of params to override [the defaults]()

### options
* revisionQueryParam (defaults to `index_key`)  
   the query parameter to specify a revision (e.g. `http://example.org/?index_key=abc123`). the key will be automatically prefaced with your `appName` for security.

## Notes
* Don't create any other redis keys you don't want exposed to the public under your `appName`. 

## Contributing
Comments/PRs/Issues are welcome!

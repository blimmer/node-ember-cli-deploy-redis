# node-ember-cli-deploy-redis [![Build Status](https://travis-ci.org/blimmer/node-ember-cli-deploy-redis.svg?branch=master)](https://travis-ci.org/blimmer/node-ember-cli-deploy-redis)

ExpressJS middleware to fetch the current (or specified) revision of your Ember App deployed by [ember-cli-deploy](https://github.com/ember-cli/ember-cli-deploy).

## Why?
[ember-cli-deploy](https://github.com/ember-cli/ember-cli-deploy) is great. It allows you to run
multiple versions in production at the same time and view revisions without impacting users.
However, [the example provided](https://github.com/philipheinser/ember-lightning) uses [koa](http://koajs.com/)
and many of us are not. This package allows you to easily fetch current and specified `index.html`
revisions from [redis](http://redis.io) with [Express](expressjs.com) and other Node servers.

## Usage
There are two main ways of using this library. For most simple Express servers, you'll
want to simply use the middleware. However, if you need more flexibility, you'll
want to use the internal `fetch` methods, with custom logic.

### ExpressJS Middleware
1. `require` the package
2. `use` the package in your app

#### Example
```javascript
var express = require('express');
var app = express();

var nodeEmberCliDeployRedis = require('node-ember-cli-deploy-redis');
app.use('/*', nodeEmberCliDeployRedis({
  host: 'redis.example.org',
  port: 6929,
  password: 'passw0rd!',
  database: 0
}, 'myapp'));
```

### Custom Fetch Method
1. `require` the package
2. Use the `fetchIndex` method
3. Render the index string as you wish.

## Example
```javascript
var express = require('express');
var app = express();

var fetchIndex = require('node-ember-cli-deploy-redis/fetch');

app.get('/', function(req, res) {
    fetchIndex(req, 'myapp', {
      host: 'redis.example.org',
      port: 6929,
      password: 'passw0rd!',
      database: 0
    }).then(function (indexHtml) {
    indexHtml = serverVarInjectHelper.injectServerVariables(indexHtml, req);
    res.status(200).send(indexHtml);
  }).catch(function(err) {
    res.status(500).send('Oh noes!\n' + err.message);
  });
});
```
Check out [location-aware-ember-server](https://github.com/blimmer/location-aware-ember-server) for a running example.

## Documentation
### `fetchIndex(request, appName, connectionInfo, options)`
Arguments
* request (required) - the request object  
   the request object is used to check for the presence of `revisionQueryParam`
* appName (required) - the application name, specified for ember deploy  
   the keys in redis are prefaced with this name, e.g. `my-app:current`
* connectionInfo (required) - the configuration to connect to redis.  
   internally, this library uses [then-redis](https://github.com/mjackson/then-redis), so pass a configuration supported by then-redis.
* options (optional) - a hash of params to override [the defaults](https://github.com/blimmer/node-ember-cli-deploy-redis/blob/develop/README.md#options)

### options
* `revisionQueryParam` (defaults to `index_key`)  
   the query parameter to specify a revision (e.g. `http://example.org/?index_key=abc123`). the key will be automatically prefaced with your `appName` for security.

## Notes
* Don't create any other redis keys you don't want exposed to the public under your `appName`.

## Contributing
Comments/PRs/Issues are welcome!

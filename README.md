# node-ember-cli-deploy-redis [![Build Status](https://travis-ci.org/blimmer/node-ember-cli-deploy-redis.svg?branch=master)](https://travis-ci.org/blimmer/node-ember-cli-deploy-redis)

ExpressJS middleware to fetch the current (or specified) revision of your Ember App deployed by [ember-cli-deploy](https://github.com/ember-cli/ember-cli-deploy).

## Why?
[ember-cli-deploy](https://github.com/ember-cli/ember-cli-deploy) is great. It allows you to run
multiple versions in production at the same time and view revisions without impacting users.
However, [the example provided](https://github.com/philipheinser/ember-lightning) uses [koa](http://koajs.com/)
and many of us are not. This package allows you to easily fetch current and specified `index.html`
revisions from [redis](http://redis.io) with [Express](expressjs.com) and other Node servers.

## Installation
It's important to choose the right version of this library to match the version of
ember-cli-deploy you're using.

| ember-cli-deploy version | node-ember-cli-deploy-redis |
|--------------------------|-----------------------------|
| pre 0.5                  | ^0.2.0 or lower             |
| 0.5 and beyond           | ^0.3.0 or newer             |

Make sure to look at the
[older documentation](https://github.com/blimmer/node-ember-cli-deploy-redis/blob/v0.2.0/README.md)
if you're on a pre 0.5 ember-cli-deploy release.
See [the changelog](https://github.com/blimmer/node-ember-cli-deploy-redis/blob/develop/CHANGELOG.md#030---2015-11-07)
for an upgrade guide.

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
app.use('/*', nodeEmberCliDeployRedis('myapp:index', {
  host: 'redis.example.org',
  port: 6929,
  password: 'passw0rd!',
  database: 0
}));
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
    fetchIndex(req, 'myapp:index', {
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
### `nodeEmberCliDeployRedis(keyPrefix, connectionInfo, options)` (middleware constructor)
* keyPrefix (required) - the application name, specified for ember deploy  
   the keys in redis are prefaced with this name. For instance, if your redis keys are `my-app:index:current`, you'd pass `my-app:index`.
* connectionInfo (required) - the configuration to connect to redis.  
   internally, this library uses [then-redis](https://github.com/mjackson/then-redis), so pass a configuration supported by then-redis. please see their README for more information.
* options (optional) - a hash of params to override [the defaults](https://github.com/blimmer/node-ember-cli-deploy-redis/blob/develop/README.md#options)

### `fetchIndex(request, keyPrefix, connectionInfo, options)`
Arguments
* request (required) - the request object  
   the request object is used to check for the presence of `revisionQueryParam`
* keyPrefix (required) - the application name, specified for ember deploy  
   the keys in redis are prefaced with this name. For instance, if your redis keys are `my-app:index:current`, you'd pass `my-app:index`.
* connectionInfo (required) - the configuration to connect to redis.  
   internally, this library uses [then-redis](https://github.com/mjackson/then-redis), so pass a configuration supported by then-redis.
* options (optional) - a hash of params to override [the defaults](https://github.com/blimmer/node-ember-cli-deploy-redis/blob/develop/README.md#options)
Returns
* a [Promise](https://github.com/petkaantonov/bluebird/blob/master/API.md#core)  
   when resolved, it returns the requested `index.html` string  
   when failed, it returns an [EmberCliDeployError](https://github.com/blimmer/node-ember-cli-deploy-redis/blob/develop/errors/ember-cli-deploy-error.js).


### options
* `revisionQueryParam` (defaults to `index_key`)  
   the query parameter to specify a revision (e.g. `http://example.org/?index_key=abc123`). the key will be automatically prefaced with your `keyPrefix` for security.

## Testing
In order to facilitate unit testing and/or integration testing this
library exports a mockable redis api.  You will need to use a
dependency injection framework such as
[rewire](https://github.com/jhnns/rewire) to activate this testing api.

### Usage with rewire (mocha syntax)

```
// my-module.js
var fetchIndex = require('node-ember-cli-deploy-redis/fetch');
var indexWrapper = function(req, res) {
  return fetchIndex(req, 'app', {
    // real redis config
  }).then(function (indexHtml)) {
    // do something with index
  });
};
module.exports = indexWrapper;

// my-module-test.js
var redisTestApi = require('node-ember-cli-deploy-redis/test/helpers/test-api');
var fetchIndex = rewire('node-ember-cli-deploy-redis/fetch');
var redis = redisTestApi.ThenRedisClientApi;
var myModule = rewire('my-module');

describe('my module', function() {
  afterEach(function() {
    fetchIndex.__set__('_initialized', false);
  });

  it('grabs my content', function() {
    // inject mocked content
    myModule.__set__('fetchIndex', fetchIndex);
    fetchIndex.__set__('ThenRedis', redisTestApi.ThenRedisApi);
    redis.set('app:abc123', "<html><body><h1>hello test world</h1></body></html>");
    myModule(req, res).then(function(){
      // assertions here
    })
  });
});
```


## Notes
* Don't create any other redis keys you don't want exposed to the public under your `keyPrefix`.

## Contributing
Comments/PRs/Issues are welcome!

### Running Project Tests
```
npm test
```

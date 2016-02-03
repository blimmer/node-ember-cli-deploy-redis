var Bluebird  = require('bluebird');
var _defaults = require('lodash/defaults');

var EmberCliDeployError = require('./errors/ember-cli-deploy-error');

var ioRedis = require('ioredis');
var redisClient;
var defaultConnectionInfo = {
  host: "127.0.0.1",
  port: 6379
};

var opts;
var _defaultOpts = {
  revisionQueryParam: 'index_key'
};
var _getOpts = function (opts) {
  opts = opts || {};
  return _defaults({}, opts, _defaultOpts);
};

var initialized = false;
var _initialize = function (connectionInfo, passedOpts) {
  opts = _getOpts(passedOpts);
  var config = connectionInfo ? connectionInfo : defaultConnectionInfo;

  // ioRedis uses the `db` param rather than `database`.
  // This block keeps the existing API compatible.
  if (config.database) {
    console.warn(
      "[DEPRECATION] " +
      "You passed a key called 'database' to node-ember-cli-deploy-redis. " +
      "Please replace with 'db'. This fallback will be removed in the future."
    );

    config.db = config.database;
    delete config.database;
  }

  redisClient = new ioRedis(config);

  initialized = true;
};

var fetchIndex = function (req, keyPrefix, connectionInfo, passedOpts) {
  if (!initialized) {
    _initialize(connectionInfo, passedOpts);
  }

  var indexkey;
  if (req.query[opts.revisionQueryParam]) {
    var queryKey = req.query[opts.revisionQueryParam].replace(/[^A-Za-z0-9]/g, '');
    indexkey = keyPrefix + ':' + queryKey;
  }

  var customIndexKeyWasSpecified = !!indexkey;
  function retrieveIndexKey(){
    if (indexkey) {
      return Bluebird.resolve(indexkey);
    } else {
      return redisClient.get(keyPrefix + ":current").then(function(result){
        if (!result) { throw new Error(); }
        return keyPrefix + ":" + result;
      }).catch(function(){
        throw new EmberCliDeployError("There's no " + keyPrefix + ":current revision. The site is down.", true);
      });
    }
  }

  return retrieveIndexKey().then(function(indexkey){
    return redisClient.get(indexkey);
  }).then(function(indexHtml){
      if (!indexHtml) { throw new Error(); }
      return indexHtml;
  }).catch(function(err){
    if (err.name === 'EmberCliDeployError') {
      throw err;
    } else {
      throw new EmberCliDeployError("There's no " + indexkey + " revision. The site is down.", !customIndexKeyWasSpecified);
    }
  });
};

module.exports = fetchIndex;

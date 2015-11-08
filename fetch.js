var Bluebird  = require('bluebird');
var _defaults = require('lodash/object/defaults');

var EmberCliDeployError = require('./errors/ember-cli-deploy-error');

var ThenRedis = require('then-redis');
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
  redisClient = ThenRedis.createClient(config);

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

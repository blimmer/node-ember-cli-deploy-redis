const Bluebird  = require('bluebird');
const _defaultsDeep = require('lodash/defaultsDeep');

const EmberCliDeployError = require('./errors/ember-cli-deploy-error');

const ioRedis = require('ioredis');
const memoize = require('memoizee');
let redisClient;

const defaultConnectionInfo = {
  host: "127.0.0.1",
  port: 6379
};

const _defaultOpts = {
  revisionQueryParam: 'index_key',
  memoize: false,
  memoizeOpts: {
    maxAge:   5000, // ms
    preFetch: true,
    max:      4,    // a sane default (current pointer, current html and two indexkeys in cache)
  }
};

let opts;
function _getOpts(opts) {
  opts = opts || {};
  return _defaultsDeep({}, opts, _defaultOpts);
}

let initialized = false;
function _initialize(connectionInfo, passedOpts) {
  opts = _getOpts(passedOpts);
  let config = connectionInfo ? connectionInfo : defaultConnectionInfo;

  redisClient = new ioRedis(config);

  if (opts.memoize === true) {
    let memoizeOpts = opts.memoizeOpts;
    memoizeOpts.async = false; // this should never be overwritten by the consumer
    memoizeOpts.length = 1;

    redisClient.get = memoize(redisClient.get, memoizeOpts);
  }

  initialized = true;
}

function fetchIndex(req, keyPrefix, connectionInfo, passedOpts) {
  if (!initialized) {
    _initialize(connectionInfo, passedOpts);
  }

  let indexkey;
  if (req.query[opts.revisionQueryParam]) {
    let queryKey = req.query[opts.revisionQueryParam].replace(/[^A-Za-z0-9]/g, '');
    indexkey = `${keyPrefix}:${queryKey}`;
  }

  let customIndexKeyWasSpecified = !!indexkey;
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
}

module.exports = fetchIndex;

var Bluebird = require('bluebird');

var ioRedisClientApi = {
  _storage: {},
  get: function(key){
    return Bluebird.resolve(this._storage[key]);
  },
  set: function(key, value){
    this._storage[key] = value;
    return Bluebird.resolve(value);
  },
  del: function(key){
    delete this._storage[key];
    return Bluebird.resolve();
  },
  flushall: function(){
    this._storage = {};
    return Bluebird.resolve();
  }
};

var ioRedisApi = function() {
  return ioRedisClientApi;
};

module.exports = {
  ioRedisClientApi: ioRedisClientApi,
  ioRedisApi: ioRedisApi
};

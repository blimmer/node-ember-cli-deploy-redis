var Bluebird = require('bluebird');

var ThenRedisClientApi = {
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

var ThenRedisApi = {
  createClient: function() {
    return ThenRedisClientApi;
  }
};

module.exports = {
  ThenRedisClientApi: ThenRedisClientApi,
  ThenRedisApi: ThenRedisApi
};

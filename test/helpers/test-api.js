const ioRedisClientApi = {
  _storage: {},
  get: function(key){
    return Promise.resolve(this._storage[key]);
  },
  set: function(key, value){
    this._storage[key] = value;
    return Promise.resolve(value);
  },
  del: function(key){
    delete this._storage[key];
    return Promise.resolve();
  },
  flushall: function(){
    this._storage = {};
    return Promise.resolve();
  }
};

const ioRedisApi = function() {
  return ioRedisClientApi;
};

module.exports = {
  ioRedisClientApi: ioRedisClientApi,
  ioRedisApi: ioRedisApi
};

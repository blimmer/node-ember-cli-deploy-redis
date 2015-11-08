var expect = require('chai').expect;
var sinon =  require('sinon');
var rewire = require('rewire');
var Bluebird = require('bluebird');

var fetchIndex = rewire('../fetch');

var basicReq = {
  query: {}
};

var testApi = require('./helpers/test-api');

var redisClientApi = testApi.ThenRedisClientApi;

var ThenRedisApi = testApi.ThenRedisApi;

describe('fetch', function() {
  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
    fetchIndex.__set__('ThenRedis', ThenRedisApi);
  });

  afterEach(function() {
    fetchIndex.__set__('initialized', false);
    sandbox.restore();
  });

  describe('_getOpts', function() {
    var _getOpts;

    beforeEach(function () {
      _getOpts = fetchIndex.__get__('_getOpts');
    });

    it('has a default revisionQueryParam', function() {
      expect(_getOpts().revisionQueryParam).to.equal('index_key');
    });

    it('allows override of revisionQueryParam', function() {
      expect(_getOpts({revisionQueryParam: 'foobar'}).revisionQueryParam).to.equal('foobar');
    });
  });

  describe('_initialize', function () {
    var _initialize;
    before(function() {
      _initialize = fetchIndex.__get__('_initialize');
    });

    describe('redis client initialize', function() {
      it('sets up redis (defaults)', function() {
        var redisMock = sandbox.mock(ThenRedisApi);
        redisMock.expects('createClient').
          withArgs(fetchIndex.__get__('defaultConnectionInfo')).
          once();

        _initialize();

        redisMock.verify();
      });

      it('sets up redis (config passed)', function() {
        var configString = 'redis://h:passw0rd@example.org:6929';
        var redisMock = sandbox.mock(ThenRedisApi);
        redisMock.expects('createClient').
          withArgs(configString).
          once();

        _initialize(configString);

        redisMock.verify();
      });
    });

    describe('options initialize', function() {
      var _getOptsStub, _getOpts;
      before(function() {
        _getOpts = fetchIndex.__get__('_getOpts');
      });

      beforeEach(function() {
        _getOptsStub = sandbox.stub();
        fetchIndex.__set__('_getOpts', _getOptsStub);
      });

      after(function() {
        fetchIndex.__set__('_getOpts', _getOpts);
      });

      it('calls _getOpts', function() {
        _initialize();

        expect(_getOptsStub.calledOnce).to.be.true;
      });
    });

    it('sets initialized flag', function() {
      expect(fetchIndex.__get__('initialized')).to.be.false;
      _initialize();
      expect(fetchIndex.__get__('initialized')).to.be.true;
    });
  });

  describe('fetchIndex', function() {
    var redis, redisSpy;

    before(function() {
      redis = redisClientApi;
    });

    beforeEach(function() {
      redisSpy = sandbox.spy(redis, 'get');
    });

    afterEach(function() {
      redis.flushall();
    });

    it('normalizes spaces in revisionQueryParam', function(done) {
      var req = {
        query: {
          index_key: 'abc 123'
        }
      };

      redis.set('myapp:index:abc123', 'foo').then(function(){
        fetchIndex(req, 'myapp:index').then(function() {
          expect(redisSpy.calledWith('myapp:index:abc123')).to.be.true;
          expect(redisSpy.calledWith('myapp:index:abc 123')).to.be.false;
          done();
        }).catch(function(err) {
          done(err);
        });
      });

    });

    it('removes special chars revisionQueryParam', function(done) {
      var req = {
        query: {
          index_key: 'ab@*#!c(@)123'
        }
      };

      redis.set('myapp:index:abc123', 'foo').then(function(){
        fetchIndex(req, 'myapp:index').then(function() {
          expect(redisSpy.calledWith('myapp:index:abc123')).to.be.true;
          expect(redisSpy.calledWith('myapp:index:ab@*#!c(@)123')).to.be.false;
          done();
        }).catch(function(err) {
          done(err);
        });
      });
    });

    it('fails the promise with a critical error if keyPrefix:current is not present', function(done) {
      redis.del('myapp:index:current').then(function(){
        fetchIndex(basicReq, 'myapp:index').then(function(res) {
          done("Promise should not have resolved.");
        }).catch(function(err) {
          expect(redisSpy.calledWith('myapp:index:current')).to.be.true;
          expect(err.critical).to.be.true;
          done();
        });
      });
    });

    it('fails the promise with a critical error if revision pointed to by keyPrefix:current is not present', function(done) {
      redis.set('myapp:index:current', 'abc123').then(function(){
        return redis.del('myapp:index:abc123');
      }).then(function(){
        fetchIndex(basicReq, 'myapp:index').then(function() {
          done("Promise should not have resolved.");
        }).catch(function(err) {
          expect(redisSpy.calledWith('myapp:index:current')).to.be.true;
          expect(redisSpy.calledWith('myapp:index:abc123')).to.be.true;
          expect(err.critical).to.be.true;
          done();
        });
      });
    });

    it('fails the promise with a non-critical error if revision requestd by query param is not present', function(done) {
      req = {
        query: {
          index_key: 'abc123'
        }
      };
      redis.del('myapp:index:abc123').then(function(){
        fetchIndex(req, 'myapp:index').then(function() {
          done("Promise should not have resolved.");
        }).catch(function(err) {
          expect(redisSpy.calledWith('myapp:index:abc123')).to.be.true;
          expect(err.critical).to.be.false;
          done();
        });
      });
    });

    it('resolves the promise with the index html requested', function(done) {
      var currentHtmlString = '<html><body>1</body></html>';
      Bluebird.all([
        redis.set('myapp:index:current', 'abc123'),
        redis.set('myapp:index:abc123', currentHtmlString),
      ]).then(function(){
        fetchIndex(basicReq, 'myapp:index').then(function(html) {
          expect(redisSpy.calledWith('myapp:index:current')).to.be.true;
          expect(redisSpy.calledWith('myapp:index:abc123')).to.be.true;
          expect(html).to.equal(currentHtmlString);
          done();
        }).catch(function(err) {
          done("Promise should not have failed.");
        });
      });
    });

    it('resolves the promise with the index html requested (specific revision)', function(done) {
      var currentHtmlString = '<html><body>1</body></html>';
      var newDeployHtmlString = '<html><body>2</body></html>';
      var req = {
        query: {
          index_key: 'def456'
        }
      };
      Bluebird.all([
        redis.set('myapp:index:current', 'abc123'),
        redis.set('myapp:index:abc123', currentHtmlString),
        redis.set('myapp:index:def456', newDeployHtmlString)
      ]).then(function(){
        fetchIndex(req, 'myapp:index').then(function(html) {
          expect(redisSpy.calledWith('myapp:index:current')).to.be.false;
          expect(redisSpy.calledWith('myapp:index:abc123')).to.be.false;
          expect(redisSpy.calledWith('myapp:index:def456')).to.be.true;
          expect(html).to.equal(newDeployHtmlString);
          done();
        }).catch(function(err) {
          done("Promise should not have failed.");
        });
      });
    });
  });
});

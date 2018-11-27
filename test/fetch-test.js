var expect = require('chai').expect;
var sinon =  require('sinon');
var rewire = require('rewire');
var Bluebird = require('bluebird');

var fetchIndex = rewire('../fetch');

var basicReq = {
  query: {}
};

var testApi = require('./helpers/test-api');
var redisClientApi = testApi.ioRedisClientApi;
var ioRedisApi = testApi.ioRedisApi;

describe('fetch', function() {
  var sandbox;
  before(function() {
    sandbox = sinon.sandbox.create();
    fetchIndex.__set__('ioRedis', ioRedisApi);
  });

  afterEach(function() {
    fetchIndex.__set__('initialized', false);
    sandbox.restore();
  });

  describe('_initialize', function () {
    var _initialize;
    before(function() {
      _initialize = fetchIndex.__get__('_initialize');
    });
    after(function() {
      fetchIndex.__set__('ioRedis', ioRedisApi);
    });

    describe('redis client initialize', function() {
      var ioRedisInitStub;
      beforeEach(function() {
        ioRedisInitStub = sandbox.stub();
        fetchIndex.__set__('ioRedis', ioRedisInitStub);
      });

      it('sets up redis (defaults)', function() {
        _initialize();

        expect(ioRedisInitStub.calledOnce).to.be.true;
        expect(ioRedisInitStub.calledWithNew()).to.be.true;
        expect(ioRedisInitStub.firstCall.args.length).to.equal(1);

        var callArg = ioRedisInitStub.firstCall.args[0];
        expect(callArg).to.be.an('object');
        expect(callArg).to.equal(fetchIndex.__get__('defaultConnectionInfo'));
      });

      it('sets up redis (config passed)', function() {
        var configString = 'redis://h:passw0rd@example.org:6929';
        _initialize(configString);

        expect(ioRedisInitStub.calledOnce).to.be.true;
        expect(ioRedisInitStub.calledWithNew()).to.be.true;
        expect(ioRedisInitStub.firstCall.args.length).to.equal(1);

        var callArg = ioRedisInitStub.firstCall.args[0];

        expect(callArg).to.be.a('string');
        expect(callArg).to.equal(configString);
      });
    });

    describe('memoization', function() {
      var memoizeStub;
      beforeEach(function() {
        memoizeStub = sandbox.stub();
        fetchIndex.__set__('memoize', memoizeStub);
      });

      after(function() {
        fetchIndex.__set__('memoize', require('memoizee'));
      });

      context('not enabled (default)', function() {
        it('does not enable memoize redis.get', function() {
          _initialize();
          expect(memoizeStub.called).to.be.false;
        });
      });

      context('enabled', function() {
        it('passes default options to memoize', function() {
          _initialize({}, { memoize: true });

          expect(memoizeStub.calledOnce).to.be.true;
          var opts = memoizeStub.firstCall.args[1];
          expect(opts).to.deep.equal({
            maxAge: 5000,
            preFetch: true,
            max: 4,
            async: false,
            length: 1,
          });
        });

        it('allows overriding existing properties', function() {
          var myOpts = {
            maxAge: 10000,
            preFetch: 0.6,
            max: 2,
          };

          _initialize({}, {
            memoize: true,
            memoizeOpts: myOpts,
          });

          expect(memoizeStub.calledOnce).to.be.true;
          var opts = memoizeStub.firstCall.args[1];
          expect(opts).to.deep.equal({
            maxAge: 10000,
            preFetch: 0.6,
            max: 2,
            async: false,
            length: 1,
          });
        });

        it('allows adding additional memoizee options', function() {
          var myDispose = function() {
            // some custom dispose logic because I'm a masochist
          };
          myOpts = {
            dispose: myDispose
          };

          _initialize({}, {
            memoize: true,
            memoizeOpts: myOpts,
          });

          expect(memoizeStub.calledOnce).to.be.true;
          var opts = memoizeStub.firstCall.args[1];
          expect(opts).to.include({
            dispose: myDispose
          });
        });

        it('does not allow overriding async flag', function() {
          var myOpts = {
            async: true,
          };

          _initialize({}, {
            memoize: true,
            memoizeOpts: myOpts,
          });

          expect(memoizeStub.calledOnce).to.be.true;
          var opts = memoizeStub.firstCall.args[1];
          expect(opts).to.deep.equal({
            maxAge: 5000,
            preFetch: true,
            max: 4,
            async: false,
            length: 1,
          });
        });

        it('does not allow overriding the length property', function() {
          var myOpts = {
            length: 2,
          };

          _initialize({}, {
            memoize: true,
            memoizeOpts: myOpts,
          });

          expect(memoizeStub.calledOnce).to.be.true;
          var opts = memoizeStub.firstCall.args[1];
          expect(opts).to.deep.equal({
            maxAge: 5000,
            preFetch: true,
            max: 4,
            async: false,
            length: 1,
          });
        });
      });
    });

    describe('revisionQueryParam', function() {
      it('has a default revisionQueryParam', function() {
        _initialize();

        var opts = fetchIndex.__get__('opts');
        expect(opts.revisionQueryParam).to.equal('index_key');
      });

      it('allows override of revisionQueryParam', function() {
        _initialize({}, {revisionQueryParam: 'foobar'});

        var opts = fetchIndex.__get__('opts');
        expect(opts.revisionQueryParam).to.equal('foobar');
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

    it('memoizes results from redis when turned on', function() {
      var currentHtmlString = '<html><body>1</body></html>';
      Bluebird.all([
        redis.set('myapp:index:current', 'abc123'),
        redis.set('myapp:index:abc123', currentHtmlString),
        fetchIndex(basicReq, 'myapp:index', null, { memoize: true }),
        fetchIndex(basicReq, 'myapp:index', null, { memoize: true }),
        fetchIndex(basicReq, 'myapp:index', null, { memoize: true }),
      ]).then(function(){
        expect(redisSpy.withArgs('myapp:index:current').calledOnce).to.be.true;
        expect(redisSpy.withArgs('myapp:index:abc123').calledOnce).to.be.true;
      });
    });
  });
});

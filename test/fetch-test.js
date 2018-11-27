const { expect } = require('chai');
require('chai').use(require("sinon-chai"));

const { describe, it, before, after, beforeEach, afterEach } = require('mocha');
const context = describe;

const sinon =  require('sinon');
const rewire = require('rewire');
const Bluebird = require('bluebird');

const fetchIndex = rewire('../fetch');

const basicReq = {
  query: {}
};

const testApi = require('./helpers/test-api');
const redisClientApi = testApi.ioRedisClientApi;
const ioRedisApi = testApi.ioRedisApi;

describe('fetch', function() {
  let sandbox;
  before(function() {
    sandbox = sinon.createSandbox();
    fetchIndex.__set__('ioRedis', ioRedisApi);
  });

  afterEach(function() {
    fetchIndex.__set__('initialized', false);
    sandbox.restore();
  });

  describe('_initialize', function () {
    let _initialize;
    before(function() {
      _initialize = fetchIndex.__get__('_initialize');
    });
    after(function() {
      fetchIndex.__set__('ioRedis', ioRedisApi);
    });

    describe('redis client initialize', function() {
      let ioRedisInitStub;
      beforeEach(function() {
        ioRedisInitStub = sandbox.stub();
        fetchIndex.__set__('ioRedis', ioRedisInitStub);
      });

      it('sets up redis (defaults)', function() {
        _initialize();

        expect(ioRedisInitStub).to.have.been.calledOnce;
        expect(ioRedisInitStub).to.have.been.calledWithNew;
        expect(ioRedisInitStub).to.have.been.calledOnceWith({
          host: "127.0.0.1",
          port: 6379
        });
      });

      it('sets up redis (config passed)', function() {
        let configString = 'redis://h:passw0rd@example.org:6929';
        _initialize(configString);

        expect(ioRedisInitStub).to.have.been.calledOnce;
        expect(ioRedisInitStub).to.have.been.calledWithNew;
        expect(ioRedisInitStub).to.have.been.calledOnceWith(configString);
      });
    });

    describe('memoization', function() {
      let memoizeStub;
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

          expect(memoizeStub).to.have.been.calledOnceWith(undefined, {
            maxAge: 5000,
            preFetch: true,
            max: 4,
            async: false,
            length: 1,
          });
        });

        it('allows overriding existing properties', function() {
          let myOpts = {
            maxAge: 10000,
            preFetch: 0.6,
            max: 2,
          };

          _initialize({}, {
            memoize: true,
            memoizeOpts: myOpts,
          });

          expect(memoizeStub).calledOnceWith(undefined, {
            maxAge: 10000,
            preFetch: 0.6,
            max: 2,
            async: false,
            length: 1,
          });
        });

        it('allows adding additional memoizee options', function() {
          const myDispose = function() {
            // some custom dispose logic because I'm a masochist
          };
          let myOpts = {
            dispose: myDispose
          };

          _initialize({}, {
            memoize: true,
            memoizeOpts: myOpts,
          });

          expect(memoizeStub).calledOnceWith(undefined, {
            async: false,
            dispose: myDispose,
            length: 1,
            max: 4,
            maxAge: 5000,
            preFetch: true
          });
        });

        it('does not allow overriding async flag', function() {
          let myOpts = {
            async: true,
          };

          _initialize({}, {
            memoize: true,
            memoizeOpts: myOpts,
          });

          expect(memoizeStub).to.have.been.calledOnceWith(undefined, {
            maxAge: 5000,
            preFetch: true,
            max: 4,
            async: false,
            length: 1,
          });
        });

        it('does not allow overriding the length property', function() {
          let myOpts = {
            length: 2,
          };

          _initialize({}, {
            memoize: true,
            memoizeOpts: myOpts,
          });

          expect(memoizeStub).to.have.been.calledOnceWith(undefined, {
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

        let opts = fetchIndex.__get__('opts');
        expect(opts.revisionQueryParam).to.equal('index_key');
      });

      it('allows override of revisionQueryParam', function() {
        _initialize({}, {revisionQueryParam: 'foobar'});

        let opts = fetchIndex.__get__('opts');
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
    let redis, redisSpy;

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
      const req = {
        query: {
          index_key: 'abc 123'
        }
      };

      redis.set('myapp:index:abc123', 'foo').then(function(){
        fetchIndex(req, 'myapp:index').then(function() {
          expect(redisSpy).to.have.been.calledWith('myapp:index:abc123');
          expect(redisSpy).to.not.have.been.calledWith('myapp:index:abc 123');
          done();
        }).catch(function(err) {
          done(err);
        });
      });

    });

    it('removes special chars revisionQueryParam', function(done) {
      const req = {
        query: {
          index_key: 'ab@*#!c(@)123'
        }
      };

      redis.set('myapp:index:abc123', 'foo').then(function(){
        fetchIndex(req, 'myapp:index').then(function() {
          expect(redisSpy).to.have.been.calledWith('myapp:index:abc123');
          expect(redisSpy).to.not.have.been.calledWith('myapp:index:ab@*#!c(@)123');
          done();
        }).catch(function(err) {
          done(err);
        });
      });
    });

    it('fails the promise with a critical error if keyPrefix:current is not present', function(done) {
      redis.del('myapp:index:current').then(function(){
        fetchIndex(basicReq, 'myapp:index').then(function() {
          done("Promise should not have resolved.");
        }).catch(function(err) {
          expect(redisSpy).to.have.been.calledWith('myapp:index:current');
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
          expect(redisSpy).to.have.been.calledWith('myapp:index:current');
          expect(redisSpy).to.have.been.calledWith('myapp:index:abc123');
          expect(err.critical).to.be.true;
          done();
        });
      });
    });

    it('fails the promise with a non-critical error if revision requestd by query param is not present', function(done) {
      const req = {
        query: {
          index_key: 'abc123'
        }
      };
      redis.del('myapp:index:abc123').then(function(){
        fetchIndex(req, 'myapp:index').then(function() {
          done("Promise should not have resolved.");
        }).catch(function(err) {
          expect(redisSpy).to.have.been.calledWith('myapp:index:abc123');
          expect(err.critical).to.be.false;
          done();
        });
      });
    });

    it('resolves the promise with the index html requested', function(done) {
      const currentHtmlString = '<html><body>1</body></html>';
      Bluebird.all([
        redis.set('myapp:index:current', 'abc123'),
        redis.set('myapp:index:abc123', currentHtmlString),
      ]).then(function(){
        fetchIndex(basicReq, 'myapp:index').then(function(html) {
          expect(redisSpy).to.have.been.calledWith('myapp:index:current');
          expect(redisSpy).to.have.been.calledWith('myapp:index:abc123');
          expect(html).to.equal(currentHtmlString);
          done();
        }).catch(function() {
          done("Promise should not have failed.");
        });
      });
    });

    it('resolves the promise with the index html requested (specific revision)', function(done) {
      const currentHtmlString = '<html><body>1</body></html>';
      const newDeployHtmlString = '<html><body>2</body></html>';
      const req = {
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
          expect(redisSpy).to.not.have.been.calledWith('myapp:index:current');
          expect(redisSpy).to.have.been.calledWith('myapp:index:def456');
          expect(html).to.equal(newDeployHtmlString);
          done();
        }).catch(function() {
          done("Promise should not have failed.");
        });
      });
    });

    it('memoizes results from redis when turned on', function(done) {
      const currentHtmlString = '<html><body>1</body></html>';
      Bluebird.all([
        redis.set('myapp:index:current', 'abc123'),
        redis.set('myapp:index:abc123', currentHtmlString),
        fetchIndex(basicReq, 'myapp:index', null, { memoize: true }),
        fetchIndex(basicReq, 'myapp:index', null, { memoize: true }),
        fetchIndex(basicReq, 'myapp:index', null, { memoize: true }),
      ]).then(function(){
        expect(redisSpy).to.have.been.calledWith('myapp:index:current');
        expect(redisSpy).to.have.been.calledWith('myapp:index:abc123');
        done();
      });
    });
  });
});

var expect = require('chai').expect;
var sinon =  require('sinon');
var rewire = require('rewire');

var subject = rewire('../index');

var basicReq = {
  query: {}
};

describe('_getOpts', function() {
  var _getOpts;

  beforeEach(function () {
    _getOpts = subject.__get__('_getOpts');
  });

  it('has a default revisionQueryParam', function() {
    expect(_getOpts().revisionQueryParam).to.equal('index_key');
  });

  it('allows override of revisionQueryParam', function() {
    expect(_getOpts({revisionQueryParam: 'foobar'}).revisionQueryParam).to.equal('foobar');
  });
});

describe('fetchIndex', function() {
  var sandbox, redis, redisSpy;

  before(function() {
    sandbox = sinon.sandbox.create();
    redis = require('redis-mock').createClient();
  });

  beforeEach(function() {
    redisApi = {
      get: function() {}
    };
    redisSpy = sandbox.spy(redis, 'get');
  });

  afterEach(function() {
    sandbox.restore();
    redis.flushall();
  });

  after(function() {
    redis.end();
  });

  it('normalizes spaces in revisionQueryParam', function(done) {
    var req = {
      query: {
        index_key: 'abc 123'
      }
    };

    redis.set('myapp:abc123', 'foo');

    subject.fetchIndex('myapp', req, redis).then(function() {
      expect(redisSpy.calledWith('myapp:abc123')).to.be.true;
      expect(redisSpy.calledWith('myapp:abc 123')).to.be.false;
      done();
    }).catch(function(err) {
      done(err);
    });
  });

  it('removes special chars revisionQueryParam', function(done) {
    var req = {
      query: {
        index_key: 'ab@*#!c(@)123'
      }
    };

    redis.set('myapp:abc123', 'foo');

    subject.fetchIndex('myapp', req, redis).then(function() {
      expect(redisSpy.calledWith('myapp:abc123')).to.be.true;
      expect(redisSpy.calledWith('myapp:ab@*#!c(@)123')).to.be.false;
      done();
    }).catch(function(err) {
      done(err);
    });
  });

  it('fails the promise with a critical error if appName:current is not present', function(done) {
    redis.del('myapp:current');

    subject.fetchIndex('myapp', basicReq, redis).then(function() {
      done("Promise should not have resolved.");
    }).catch(function(err) {
      expect(redisSpy.calledWith('myapp:current')).to.be.true;
      expect(err.critical).to.be.true;
      done();
    });
  });

  it('fails the promise with a critical error if revision pointed to by appName:current is not present', function(done) {
    redis.set('myapp:current', 'myapp:abc123');
    redis.del('myapp:abc123');

    subject.fetchIndex('myapp', basicReq, redis).then(function() {
      done("Promise should not have resolved.");
    }).catch(function(err) {
      expect(redisSpy.calledWith('myapp:current')).to.be.true;
      expect(redisSpy.calledWith('myapp:abc123')).to.be.true;
      expect(err.critical).to.be.true;
      done();
    });
  });

  it('fails the promise with a non-critical error if revision requestd by query param is not present', function(done) {
    redis.del('myapp:abc123');
    req = {
      query: {
        index_key: 'abc123'
      }
    };

    subject.fetchIndex('myapp', req, redis).then(function() {
      done("Promise should not have resolved.");
    }).catch(function(err) {
      expect(redisSpy.calledWith('myapp:abc123')).to.be.true;
      expect(err.critical).to.be.false;
      done();
    });
  });

  it('resolves the promise with the index html requested', function(done) {
    var currentHtmlString = '<html><body>1</body></html>';
    redis.set('myapp:current', 'myapp:abc123');
    redis.set('myapp:abc123', currentHtmlString);

    subject.fetchIndex('myapp', basicReq, redis).then(function(html) {
      expect(redisSpy.calledWith('myapp:current')).to.be.true;
      expect(redisSpy.calledWith('myapp:abc123')).to.be.true;
      expect(html).to.equal(currentHtmlString);
      done();
    }).catch(function(err) {
      done("Promise should not have failed.");
    });
  });

  it('resolves the promise with the index html requested (specific revision)', function(done) {
    var currentHtmlString = '<html><body>1</body></html>';
    var newDeployHtmlString = '<html><body>2</body></html>';
    redis.set('myapp:current', 'myapp:abc123');
    redis.set('myapp:abc123', currentHtmlString);
    redis.set('myapp:def456', newDeployHtmlString);

    var req = {
      query: {
        index_key: 'def456'
      }
    };

    subject.fetchIndex('myapp', req, redis).then(function(html) {
      expect(redisSpy.calledWith('myapp:current')).to.be.false;
      expect(redisSpy.calledWith('myapp:abc123')).to.be.false;
      expect(redisSpy.calledWith('myapp:def456')).to.be.true;
      expect(html).to.equal(newDeployHtmlString);
      done();
    }).catch(function(err) {
      done("Promise should not have failed.");
    });
  });
});

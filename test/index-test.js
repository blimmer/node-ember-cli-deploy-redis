var expect    = require('chai').expect;
var sinon     = require('sinon');
var httpMocks = require('node-mocks-http');
var Bluebird  = require('bluebird');
var rewire    = require('rewire');

var middleware = rewire('../index');
var EmberCliDeployError = require('../errors/ember-cli-deploy-error');

var htmlString = '<html><body>1</body></html>';

describe('express middleware', function() {
  var sandbox, req, res, fetchIndexStub;
  before(function() {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function() {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();

    fetchIndexStub = sandbox.stub();
    middleware.__set__('fetchIndex', fetchIndexStub);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('success', function() {
    it('returns a 200 and sends the html', function(done) {
      fetchIndexStub.returns(Bluebird.resolve(htmlString));

      middleware()(req, res).then(function() {
        expect(res.statusCode).to.equal(200);
        var data = res._getData();
        expect(data).to.equal(htmlString);
        done();
      });
    });
  });

  describe('failure', function() {
    it('returns a 500 and the error', function(done) {
      var error = new EmberCliDeployError();
      fetchIndexStub.returns(Bluebird.reject(error));

      middleware()(req, res).then(function() {
        done('Promise should not have resolved');
      }).catch(function() {
        expect(res.statusCode).to.equal(500);
        var data = res._getData();
        expect(data).to.equal(error);
        done();
      });
    });
  });
});

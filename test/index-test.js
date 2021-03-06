var expect    = require('chai').expect;
var { describe, before, beforeEach, afterEach, it } = require('mocha');

var sinon     = require('sinon');
var httpMocks = require('node-mocks-http');
var rewire    = require('rewire');

var middleware = rewire('../index');
var EmberCliDeployError = require('../errors/ember-cli-deploy-error');

var htmlString = '<html><body>1</body></html>';

describe('express middleware', function() {
  var sandbox, req, res, fetchIndexStub;
  before(function() {
    sandbox = sinon.createSandbox();
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
      fetchIndexStub.returns(Promise.resolve(htmlString));

      middleware()(req, res).then(function() {
        expect(res.statusCode).to.equal(200);
        var data = res._getData();
        expect(data).to.equal(htmlString);
        done();
      });
    });
  });

  describe('failure', function() {
    it('calls the `next` function with the error', function(done) {
      var error = new EmberCliDeployError();
      fetchIndexStub.returns(Promise.reject(error));

      function nextExpectation() {
        expect(arguments).to.have.length(1);
        expect(arguments[0]).to.equal(error);
        done();
      }

      middleware()(req, res, nextExpectation).then(function() {
        done('Promise should not have resolved');
      });
    });
  });
});

var async     = require('async');
var Promise   = require('bluebird');
var _defaults = require('lodash/object/defaults');

var EmberCliDeployError = require('./errors/ember-cli-deploy-error');

var _defaultOpts = {
  revisionQueryParam: 'index_key'
};

var _getOpts = function (opts) {
  opts = opts || {};
  return _defaults({}, opts, _defaultOpts);
};

var fetchIndex = function (appName, req, client, opts) {
  opts = _getOpts(opts);

  var indexkey;
  if (req.query[opts.revisionQueryParam]) {
    var queryKey = req.query[opts.revisionQueryParam].replace(/[^A-Za-z0-9]/g, '');
    indexkey = appName + ':' + queryKey;
  }

  return new Promise(function(resolve, reject) {
    async.waterfall([
      // 1. Get the current indexkey, or use the one provided in the query param
      function(callback) {
        if (indexkey) {
          callback(null, indexkey, false);
        } else {
          client.get(appName + ":current", function(err, indexkey) {
            if (err || !indexkey) {
              callback(new EmberCliDeployError("There's no " + appName + ":current revision. The site is down.", true));
            } else {
              callback(null, indexkey, true);
            }
          });
        }
      },
      // 2. Get the index page out of redis
      function(indexkey, isCurrent, callback) {
        client.get(indexkey, function(err, index) {
          if (err || !index) {
            if (isCurrent) {
              callback(new EmberCliDeployError("There's no " + indexkey + " revision. The site is down", true));
            } else {
              callback(new EmberCliDeployError("There's no " + indexkey + " revision.", false));
            }
          } else {
            callback(null, index);
          }
        });
      },
      function(index, callback) {
        callback(null, index);
      }
    ], function(err, indexHtml) {
      if (err) {
        reject(err);
      } else {
        resolve(indexHtml);
      }
    });
  });
};

module.exports = {
  fetchIndex: fetchIndex
};

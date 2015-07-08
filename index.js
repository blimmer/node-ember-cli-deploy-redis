'use strict';

var Bluebird = require('bluebird');
var fetchIndex = require('./fetch');

module.exports = function (appName, connectionInfo, opts) {
  return function(req, res) {
    return new Bluebird(function (resolve, reject) {
      fetchIndex(req, appName, connectionInfo, opts).then(function(indexHtml) {
        res.status(200).send(indexHtml);
        resolve();
      }).catch(function(err) {
        res.status(500).send(err);
        reject();
      });
    });
  };
};

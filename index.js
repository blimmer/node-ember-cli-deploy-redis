'use strict';

var Bluebird = require('bluebird');
var fetchIndex = require('./fetch');

module.exports = function (keyPrefix, connectionInfo, opts) {
  return function(req, res) {
    return new Bluebird(function (resolve, reject) {
      fetchIndex(req, keyPrefix, connectionInfo, opts).then(function(indexHtml) {
        res.status(200).send(indexHtml);
        resolve();
      }).catch(function(err) {
        res.status(500).send(err);
        reject();
      });
    });
  };
};

'use strict';

const Bluebird = require('bluebird');
const fetchIndex = require('./fetch');

module.exports = function (keyPrefix, connectionInfo, opts) {
  return function(req, res, next) {
    return new Bluebird(function (resolve) {
      fetchIndex(req, keyPrefix, connectionInfo, opts).then(function(indexHtml) {
        res.status(200).send(indexHtml);
        resolve();
      }).catch(function(err) {
        next(err);
      });
    });
  };
};

'use strict';

module.exports = function EmberCliDeployError(message, critical) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.critical = critical;
};

require('util').inherits(module.exports, Error);

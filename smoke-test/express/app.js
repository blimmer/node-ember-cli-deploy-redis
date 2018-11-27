const express = require('express');
const app = express();

var nodeEmberCliDeployRedis = require('../../');

app.use('/*', nodeEmberCliDeployRedis('myapp:index', {
  host: '127.0.0.1'
}));

module.exports = app;

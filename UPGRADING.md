# Upgrading

## 0.4.x -> 1.x

Version 1.x introduces a few changes that might affect your upgrade path. Please
read this guide carefully to successfully upgrade your app.

### Node Version

Previously, this library supported versions < Node 6. To conform to the
[Node LTS Support Schedule](https://github.com/nodejs/Release), this library
now only supports Node 6 and beyond. If you're using an older version of Node,
you'll need to use a pre 1.x version of this library.

### Errors Passed Up to Application

Previously the middleware would explicitly render an error if a requested
revision key was not found. However, this prevented users from choosing their
own behavior when an error is encountered.

This change will now let the
[default express error handler](https://expressjs.com/en/guide/error-handling.html#the-default-error-handler),
or a custom-defined error handler manage this behavior.

If you'd like to retain the existing behavior, write a small middleware function such as:

```javascript
app.use(function (err, req, res, next) {
  res.status(500).send(err);
});
```

See [the documentation](https://expressjs.com/en/guide/error-handling.html#writing-error-handlers)
for more information on writing a custom error handler.

### Bluebird Replaced with Native `Promise`

If you use a custom `fetch` method, note that it will now return a native Node
`Promise` instead of a `Bluebird` promise. `Bluebird` exposes some features
that are not available in native `Promise`.

### `ioredis` upgrade

The version of `ioredis` was upgraded from 0.1.x to 0.4.x. If you're passing
more advanced configuration to ioredis, please verify that they are compatible
with newer versions of `ioredis`.

### `memoizee` upgrade

If you are not opting into memoization, this is will not be relevant to you.

The version of `memoizee` was upgraded from 0.3.x to 0.4.x. If you're passing
custom configuration parameters to `memoizee`, please confirm that they're
compatible.

### `database` redis parameter

A deprecation was introduced in 2016 that warned if you passed your database
as `database` instead of `db`. That deprecation and backwards-compatibility
has been removed in 1.x.

You'll need to change invocations that look like this:

```javascript
app.use('/*', nodeEmberCliDeployRedis('myapp:index', {
  database: 0
}));
```

to use the `db` parameter:

```javascript
app.use('/*', nodeEmberCliDeployRedis('myapp:index', {
  db: 0
}));
```

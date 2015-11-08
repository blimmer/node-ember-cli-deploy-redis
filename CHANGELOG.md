# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][unreleased]

## 0.3.0 - 2015-11-07
### Changed
- [BREAKING CHANGE] Support for ember-cli-deploy 0.5.x

#### Explanation
On the heels of the new ember-cli-deploy pipeline release, a breaking API change was
required. This is because the new [ember-cli-deploy-revision-data](https://github.com/ember-cli-deploy/ember-cli-deploy-revision-data) no longer stores the full redis key as `current` link.

In older versions you'd see something like this in redis:
```
127.0.0.1:6379> KEYS myapp*
1) "myapp:current"
2) "myapp:1e5b4f"
2) "myapp:b4bebd"

127.0.0.1:6379> GET myapp:current
"myapp:1e5b4f"
```

In 0.5 and beyond the structure has changed to this, by default:
```
127.0.0.1:6379> KEYS myapp*
1) "myapp:index:current"
2) "myapp:index:1e5b4f1970d8955f46ece25adb2bb0ce889bff97"
2) "myapp:index:b4bebd982d795d9d4b805ea7dd013f6b4da3c5d7"

127.0.0.1:6379> GET myapp:index:current
"1e5b4f1970d8955f46ece25adb2bb0ce889bff97"
```

Therefore, I had to change the logic for de-referencing the "current" revision. You'll need to follow the upgrade guide below.

#### Upgrade Guide
In order to upgrade please make sure you've done the following:
* Follow the ember-cli-deploy lightning strategy [upgrade guide](http://ember-cli.github.io/ember-cli-deploy/docs/v0.5.x/upgrading-apps/#upgrade-an-app-that-uses-the-lightning-strategy)  
You'll need to upgrade to the new version of ember-cli-deploy (0.5.x) and use the following plugins (outlined in the link above):
  - ember-cli-deploy-redis
  - ember-cli-deploy-s3
  - ember-cli-deploy-revision-data
  - ember-cli-deploy-display-revisions
* Update your `appName` parameter to `keyPrefix`  
Unless you customize your `keyPrefix` in your ember-cli-deploy configuration, your `keyPrefix` in redis will change from
`myapp:<revision>` to `myapp:index:<revision>` ([ src](https://github.com/ember-cli-deploy/ember-cli-deploy-redis/blob/v0.1.0/index.js#L28-L30)). You'll need to
make sure that you update your middleware constructor statement, or `fetchIndex` call from `myapp` to `myapp:index`.

#### Resources
* [example server upgrade](https://github.com/blimmer/location-aware-ember-server/commit/cb5e49781d5d78ee6a56ab6ff7b7adfaf45bf117)
* [example ember app upgrade](https://github.com/blimmer/location-aware-ember/commit/b4bebd982d795d9d4b805ea7dd013f6b4da3c5d7)

## 0.2.0 - 2015-07-08
### Changed
- [BREAKING CHANGE] Middleware arguments have been swapped to conform to the fetch APIs. See the [documentation](https://github.com/blimmer/node-ember-cli-deploy-redis/blob/v0.2.0/README.md#example) for info.

## 0.1.1 - 2015-06-02
### Changed
- Test objects exposed. See the [documentation](https://github.com/blimmer/node-ember-cli-deploy-redis/blob/v0.1.1/README.md#testing) for info.

## 0.1.0 - 2015-06-01
### Changed
- Reworked as an ExpressJS Middleware
- [BREAKING CHANGE] Introduce then-redis dependency, instead of passing an instantiated client

## 0.0.1 - 2015-05-24
### Added
- The initial release

[unreleased]: https://github.com/blimmer/node-ember-cli-deploy-redis/compare/v0.0.1...HEAD

#! /bin/bash

set -e

# This script starts up a redis database and seeds it with some fixture data
# to do a quick smoke-test that things are working as expected.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

REDIS_DOCKER_IMAGE='redis:5-alpine'
DOCKER_CONTAINER_NAME='node-ember-cli-deploy-redis-smoke-test'
EXPRESS_APP_PID=''

_start-redis() {
  echo "Starting redis container..."
  docker run -p 6379:6379 --name $DOCKER_CONTAINER_NAME -d $REDIS_DOCKER_IMAGE
}

_start-express-app() {
  echo "Starting express app..."
  pushd "$SCRIPT_DIR/express"
  npm install --no-package-lock
  NODE_ENV=production npm start &
  EXPRESS_APP_PID=$!

  echo "Waiting for express app to start up..."
  while ! nc -z localhost 3000; do
    sleep 0.1
  done
  echo "Express app is started!"

  popd
}

# If this gets more complex, we might want to use BATS
# https://github.com/sstephenson/bats
_test() {
  echo "Running tests..."
  DOCKER_CONTAINER_NAME=$DOCKER_CONTAINER_NAME "$SCRIPT_DIR"/test-helper/bats/bin/bats "$SCRIPT_DIR"/test.bats
}

_stop-redis() {
  echo "Killing redis container..."
  docker stop $DOCKER_CONTAINER_NAME > /dev/null
  docker rm $DOCKER_CONTAINER_NAME > /dev/null
}

_stop-express-app() {
  if [ $EXPRESS_APP_PID != "" ]; then
   echo "Killing express app..."
   kill $EXPRESS_APP_PID
  fi
}

_cleanup() {
  _stop-express-app
  _stop-redis
}

main() {
  _start-redis
  _start-express-app
  _test
}

trap _cleanup EXIT
main

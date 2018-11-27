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

_seed-redis() {
  echo "Seeding redis..."

  # See https://redis.io/topics/mass-insert for more information
  docker cp "$SCRIPT_DIR/seed_data.txt" $DOCKER_CONTAINER_NAME:/data
  docker exec $DOCKER_CONTAINER_NAME cat -- seed_data.txt | redis-cli --pipe
}

_start-express-app() {
  echo "Starting express app..."
  pushd "$SCRIPT_DIR/express"
  npm install --no-package-lock
  npm start &
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
  # To see the state of the redis instance, see smoke-test/seed_data.txt
  local index_output
  index_output=$(curl -s localhost:3000)

  if [ "$index_output" != "<html><body>this is abc123</body></html>" ]; then
    echo "ERROR: index did not serve the expected HTML string"
    exit 1
  fi

  local revision_output
  revision_output=$(curl -s localhost:3000/?index_key=def456)

  if [ "$revision_output" != "<html><body>this is def456</body></html>" ]; then
    echo "ERROR: specified revision did not serve the expected HTML string"
    exit 1
  fi

  echo "SUCCESS! All tests passed!"
}

_stop-redis() {
  echo "Killing redis container..."
  docker stop $DOCKER_CONTAINER_NAME > /dev/null
  docker rm $DOCKER_CONTAINER_NAME > /dev/null
}

_stop-express-app() {
  echo "Killing express app..."
  kill $EXPRESS_APP_PID
}

main() {
  _start-redis
  _seed-redis
  _start-express-app
  _test
  _stop-redis
  _stop-express-app
}

main

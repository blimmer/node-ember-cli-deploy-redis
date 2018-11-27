#! /bin/bash

set -e

# This script starts up a redis database and seeds it with some fixture data
# to do a quick smoke-test that things are working as expected.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

REDIS_DOCKER_IMAGE='redis:5-alpine'
DOCKER_CONTAINER_NAME='node-ember-cli-deploy-redis-smoke-test'

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

_test() {
  echo "TODO"
}

_stop-redis() {
  echo "Killing redis container..."
  docker stop $DOCKER_CONTAINER_NAME > /dev/null
  docker rm $DOCKER_CONTAINER_NAME > /dev/null
}

main() {
  _start-redis
  _seed-redis
  _test
  _stop-redis
}

main

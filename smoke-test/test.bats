load "$BATS_TEST_DIRNAME/test-helper/bats-support/load.bash"
load "$BATS_TEST_DIRNAME/test-helper/bats-assert/load.bash"

setup() {
  # See https://redis.io/topics/mass-insert for more information
  docker cp "$BATS_TEST_DIRNAME/seed_data.txt" $DOCKER_CONTAINER_NAME:/data
  docker exec $DOCKER_CONTAINER_NAME cat -- seed_data.txt | redis-cli --pipe
}

@test "it returns the current index key by default" {
  run curl -s localhost:3000
  assert_success
  assert_output '<html><body>this is abc123</body></html>'
}

@test "it returns another index key when specified" {
  run curl -s localhost:3000/?index_key=def456
  assert_success
  assert_output '<html><body>this is def456</body></html>'
}

@test "it returns a 500 when the specified key is not found in redis" {
  run curl -s localhost:3000/?index_key=ghi789
  assert_success
  assert_output --partial "Internal Server Error"
}

# !/bin/bash

# Bring down the network
export COMPOSE_PROJECT_NAME=node

DOCKER_FILE=$1

if [ -z "$DOCKER_FILE" ]; then
  echo "Using default testnet .yaml"
  DOCKER_FILE=./build-local-testnet/docker-compose.yaml
fi

./stop.sh $DOCKER_FILE
./start.sh $DOCKER_FILE

exit 0

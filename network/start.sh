# !/bin/bash

export COMPOSE_PROJECT_NAME=node

DOCKER_FILE=$1

if [ -z "$DOCKER_FILE" ]; then
  echo "Using default testnet .yaml"
  DOCKER_FILE=./build-local-testnet/docker-compose.yaml
fi

# Bring up the network
docker-compose -f $DOCKER_FILE up -d

exit 0

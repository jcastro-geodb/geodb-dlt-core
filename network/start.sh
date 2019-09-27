# !/bin/bash

DOCKER_FILE=$1

if [ -z "$DOCKER_FILE" ]; then
  echo "Using default testnet .yaml"
  export COMPOSE_PROJECT_NAME=geodb
  DOCKER_FILE=./build-local-testnet/docker-compose.yaml
else
  # Assign the directory name of the docker file as the project name for compose
  dirname="${DOCKER_FILE%"${DOCKER_FILE##*[!/]}"}"
  dirname="${result##*/}"
  export COMPOSE_PROJECT_NAME=$dirname
fi

# Bring up the network
docker-compose -f $DOCKER_FILE up -d

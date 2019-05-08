# !/bin/bash

export COMPOSE_PROJECT_NAME=geodb

# Bring down the network
docker-compose -f docker-compose.yaml kill && docker-compose -f docker-compose.yaml down
sleep 1s
# Delete EVERYTHING related to chaincode in docker
docker rmi --force $(docker images -q dev-peer*)
docker rm -f $(docker ps -aq)

if [ $(docker images dev-* -q) ]; then
  echo "Chaincode exists"
else
  echo "No chaincode exists"
fi

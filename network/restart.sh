# !/bin/bash

# Bring down the network
export COMPOSE_PROJECT_NAME=geodb

DOCKER_FILE=$1

if [ -z "$DOCKER_FILE" ]; then
  DOCKER_FILE=./build-local-tesetnet/docker-compose.yaml
fi

docker-compose -f $DOCKER_FILE kill && docker-compose -f $DOCKER_FILE down
sleep 1s
# Delete EVERYTHING related to chaincode in docker
docker rmi --force $(docker images -q dev-peer*)
docker rm -f $(docker ps -aq)

# Bring up the network
docker-compose -f $DOCKER_FILE up -d

# Create the channel on the peer from the genesis block
docker exec clipeer0.geodb.com bash -c 'peer channel create -c rewards -f ./channels/rewards.tx -o orderer0.geodb.com:7050'

# Join the channel
docker exec clipeer0.geodb.com bash -c 'peer channel join -b rewards.block'

# Update anchor peer
docker exec clipeer0.geodb.com bash -c 'peer channel update -o orderer0.geodb.com:7050 -c rewards -f ./channels/geodbanchor.tx'

if [[ `id -u` -eq 0 ]] ; then
  chown $USER ./* -R
fi

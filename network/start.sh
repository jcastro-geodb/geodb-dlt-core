# !/bin/bash

export COMPOSE_PROJECT_NAME=geodb

if [ "$(docker network ls | grep ${COMPOSE_PROJECT_NAME}_geodb)" ]; then
  >&2 echo "Network already exists. Stop the network first"
  exit 1
fi

# Bring up the network
docker-compose -f docker-compose.yaml up -d
sleep 3s

# Create the channel on the peer from the genesis block
docker exec clipeer0.geodb.com bash -c 'peer channel create -c rewards -f ./channels/rewards.tx -o orderer0.geodb.com:7050'

# Join the channel
docker exec clipeer0.geodb.com bash -c 'peer channel join -b rewards.block'

# Update anchor peer
docker exec clipeer0.geodb.com bash -c 'peer channel update -o orderer0.geodb.com:7050 -c rewards -f ./channels/geodbanchor.tx'

if [ `id -u` = "0" ]; then
  chown $USER ./* -R
fi

exit 0

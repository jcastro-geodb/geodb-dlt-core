#!/bin/bash +x
export COMPOSE_PROJECT_NAME=geodb

dir=`pwd`

# Start root CA
cd ../CA
./startRootCA.sh
sleep 1s
# Build certificates
cd ..
./generate-crypto-materials.sh --orgs operations.geodb.com:1:1:7500:geodb:password:7501
sleep 1s
# ./generate-crypto-materials.sh --orgs org1.com:1:1:7500:geodb:shouldChangeThisPass1234:7502
# ./generate-crypto-materials.sh --orgs org2.com:1:1:7500:geodb:shouldChangeThisPass1234:7503

# Generate genesis block

./channel-config.sh $dir

# Bootstrap nodes
cd $dir

if [ "$(docker network ls | grep ${COMPOSE_PROJECT_NAME}_geodb)" ]; then
  >&2 echo "Network already exists. Stop the network first"
  exit 1
fi

# Bring up the network
docker-compose -f docker-compose.yaml up -d
sleep 3s

# Create the channel on the peer from the genesis block
docker exec clipeer0.operations.geodb.com bash -c 'peer channel create -c rewards -f ./channels/rewards.tx -o orderer0.operations.geodb.com:7050'

# Join the channel
docker exec clipeer0.operations.geodb.com bash -c 'peer channel join -b rewards.block'

# Update anchor peer
docker exec clipeer0.operations.geodb.com bash -c 'peer channel update -o orderer0.operations.geodb.com:7050 -c rewards -f ./channels/geodbanchor.tx'

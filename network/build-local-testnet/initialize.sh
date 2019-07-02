#!/bin/bash +x
export COMPOSE_PROJECT_NAME=geodb
dir=`pwd`

# Start root CA
cd ../CA
./startRootCA.sh
# Build certificates
cd ..
./generate-crypto-materials.sh --orgs operations.geodb.com:1:1:7500:geodb:shouldChangeThisPass1234:7501
./generate-crypto-materials.sh --orgs org1.com:1:1:7500:geodb:shouldChangeThisPass1234:7502
./generate-crypto-materials.sh --orgs org2.com:1:1:7500:geodb:shouldChangeThisPass1234:7503

# Generate genesis block

./channel-config.sh $dir

# Bootstrap nodes
cd $dir

export COMPOSE_PROJECT_NAME=geodb

if [ "$(docker network ls | grep ${COMPOSE_PROJECT_NAME}_geodb)" ]; then
  >&2 echo "Network already exists. Stop the network first"
  exit 1
fi

# Bring up the network
docker-compose -f docker-compose.yaml up -d

# !/bin/bash

export COMPOSE_PROJECT_NAME=geodb

docker-compose -f docker-compose.yaml kill && docker-compose -f docker-compose.yaml down
cd ../
./generate-crypto-materials.sh -d

if [ -d "./channels" ]; then
  echo "Removing ./channels"
  rm -rf rm -rf ./channels
fi

if [ -d "./orderer" ]; then
  echo "Removing ./orderer"
  rm -rf rm -rf ./orderer
fi


cd ./CA
COMPOSE_PROJECT_NAME=CA docker-compose -f docker-compose.yaml kill && \
  COMPOSE_PROJECT_NAME=CA docker-compose -f docker-compose.yaml down

if [ -d "./fabric-ca-server" ]; then
  echo "Removing ./CA/fabric-ca-server"
  rm -rf rm -rf ./fabric-ca-server
fi

#!/bin/bash +x

export COMPOSE_PROJECT_NAME=geodb

docker-compose -f docker-compose.yaml kill && docker-compose -f docker-compose.yaml down
cd ../
./generate-crypto-materials.sh -d
cd ./CA
docker-compose -f docker-compose.yaml kill && docker-compose -f docker-compose.yaml down

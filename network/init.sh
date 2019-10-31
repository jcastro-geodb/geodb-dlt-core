# !/bin/bash

cd ./build-local-testnet
./reset.sh
./initialize.sh

cd ..
./install-upg-chaincode.sh
sleep 3
docker exec -i clipeer0.operations.geodb.com bash -c './scripts/invokeScript.sh'
sleep 3
docker exec -i clipeer0.operations.geodb.com bash -c "peer chaincode invoke -n privateNode -c '{\"Args\":[\"getEthereumRewards\"]}' -C privatenode1"


sleep 1

CONTAINER_IDS=$(docker ps -a | awk '($2 ~ /dev-peer0.operations.geodb.com-privatenode-*/) {print $1}')

docker logs $CONTAINER_IDS

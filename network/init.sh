# !/bin/bash

cd ./build-local-testnet
./reset.sh
./initialize.sh

cd ..
./install-upg-chaincode.sh
sleep 3
docker exec -i clipeer0.operations.geodb.com bash -c './scripts/invokeScript.sh'
sleep 3
docker exec -i clipeer0.operations.geodb.com bash -c "peer chaincode invoke -n rewardsManager -c '{\"Args\":[\"getEthereumRewards\"]}' -C nodeprivatech"


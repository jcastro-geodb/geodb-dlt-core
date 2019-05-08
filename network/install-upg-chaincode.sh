#!/bin/bash

# Chaincode: install and instantiate

chaincodeInfo=`docker exec -i clipeer0.geodb.com bash -c "peer chaincode list --installed" | tail -n +2 | tr -d ' '`


version=


for line in $chaincodeInfo
do
  echo "DETECTED LINE: $line"
  params=`echo "$line" | sed -n 1'p' | tr ',' '\n'`
  for param in $params
  do
    if [[ $param == *"Version"* ]]; then
      split=(${param//:/ })
      version=${split[1]}
    fi
  done
done


if [ -z "$version" ]; then
  echo "No chaincode installed"
  version=1
else
  echo "Detected version: $version"
  version=$(($version + 1))
fi



if [ $version -eq 1 ]; then
  echo "Starting setup for chaincode version ${version}"
  docker exec -i clipeer0.geodb.com bash -c "peer chaincode install -n geodb -v ${version} -p \$GOPATH/src/github.com/geodb/javascript-low-level/ -l node"
  docker exec -i clipeer0.geodb.com bash -c "peer chaincode instantiate -o orderer0.geodb.com:7050 -C rewards -n geodb -l node -v ${version} -c '{\"Args\":[]}'"
else
  echo "Upgrading chaincode to version ${version}"
  docker exec -i clipeer0.geodb.com bash -c "peer chaincode install -n geodb -v ${version} -p \$GOPATH/src/github.com/geodb/javascript-low-level/ -l node"
  docker exec -i clipeer0.geodb.com bash -c "peer chaincode upgrade -o orderer0.geodb.com:7050 -C rewards -n geodb -l node -v ${version} -c '{\"Args\":[]}'"
fi

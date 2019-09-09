#!/bin/bash

check_returnCode() {
        if [ $1 -eq 0 ]; then
                echo -e "INFO:.... Proccess Succeed"
        else
                >&2 echo -e "ERROR:.... Proccess ERROR: $1"
		cd $dir
		./reset.sh
		echo -e "INFO: System has been reloaded to stable previous point. However, please check errors, check if system has been properly reloaded and retry if it's ok..."
                exit $1
        fi
}

# Chaincode: install dependencies
echo "INSTALLING DEPENDENCIES"
cd ./chaincode/github.com/geodb
pwd=$(pwd)
cd go
rm -r ./vendor
cd ..
mv ./go $GOPATH/src
cd $GOPATH/src/go
dep ensure
cd ..
mv ./go /$pwd

# Chaincode: install and instantiate
echo "INSTALLING CHAINCODE"

chaincodeInfo=`docker exec -i clipeer0.operations.geodb.com bash -c "peer chaincode list --installed" | tail -n +2 | tr -d ' '`

declare -a versions=()
i=0


for line in $chaincodeInfo
do
  echo "DETECTED LINE: $line"
  params=`echo "$line" | sed -n 1'p' | tr ',' '\n'`
  for param in $params
  do
    if [[ $param == *"Version"* ]]; then
      split=(${param//:/ })
      versions[$i]=${split[1]}
      i=$((i+1)) 
    fi
  done
done

if [ -z "${versions[0]}" ]; then
  echo "No chaincode installed"
  versions[0]=1
else
  echo "Detected version: ${versions[0]}"
  versions[0]=$((versions[0] + 1))
fi

if [ -z "${versions[1]}" ]; then
  echo "No chaincode installed"
  versions[1]=1
else
  echo "Detected version: ${versions[1]}"
  versions[1]=$((versions[1] + 1))
fi

versionJS=${versions[0]}
version=${versions[1]}

echo
echo "========================================================="
echo "Installing Chaincode"
echo "========================================================="
echo

peers=$(docker ps --format '{{.Names}}' | grep clipeer)

if [ $versionJS -eq 1 ]; then
  echo "Starting setup for JS chaincode version ${versionJS}"

  for peer in $peers; do
    echo "-------------------------------- $peer ------------------------------------------"
    docker exec -i $peer bash -c "peer chaincode install -n geodbSmart -v ${versionJS} -p /opt/gopath/src/github.com/geodb/javascript-low-level/ -l node"
    check_returnCode $?
    echo "-------------------------------- $peer installed JS chaincode -----------------------------------"
    peer=$peer+1
  done
  # docker exec -i clipeer0.operations.geodb.com bash -c "peer chaincode install -n geodbSmart -v ${versionJS} -p /opt/gopath/src/github.com/geodb/javascript-low-level/ -l node"
  docker exec -i clipeer0.operations0.geodb.com bash -c "peer chaincode instantiate -o orderer0.operations0.geodb.com:7050 -C rewards -n geodbSmart -l node -v ${versionJS} -c '{\"Args\":[]}'"

else
  echo "Upgrading JS chaincode to version ${versionJS}"
  
  for peer in $peers; do
    echo "-------------------------------- $peer ------------------------------------------"
    docker exec -i $peer bash -c "peer chaincode install -n geodbSmart -v ${versionJS} -p /opt/gopath/src/github.com/geodb/javascript-low-level/ -l node"
    check_returnCode $?
    echo "-------------------------------- $peer upgraded JS chaincode -----------------------------------"
    peer=$peer+1
  done  
  
  # docker exec -i clipeer0.operations.geodb.com bash -c "peer chaincode install -n geodbSmart -v ${versionJS} -p /opt/gopath/src/github.com/geodb/javascript-low-level/ -l node"
  docker exec -i clipeer0.operations0.geodb.com bash -c "peer chaincode upgrade -o orderer0.operations0.geodb.com:7050 -C rewards -n geodbSmart -l node -v ${versionJS} -c '{\"Args\":[]}'"
fi

if [ $version -eq 1 ]; then
  echo "Starting setup for GO chaincode version ${version}"
  
  for peer in $peers; do
    echo "-------------------------------- $peer ------------------------------------------"
    docker exec -i $peer bash -c "peer chaincode install -n geodb -v ${version} -p \github.com/geodb/go/"
    check_returnCode $?
    echo "-------------------------------- $peer installed GO chaincode -----------------------------------"
    peer=$peer+1
  done 
  
  # docker exec -i clipeer0.operations.geodb.com bash -c "peer chaincode install -n geodb -v ${version} -p \github.com/geodb/go/"
  docker exec -i clipeer0.operations0.geodb.com bash -c "peer chaincode instantiate -o orderer0.operations0.geodb.com:7050 -C rewards -n geodb -l node -v ${version} -c '{\"Args\":[]}'"

else
  echo "Upgrading GO chaincode to version ${version}"
  
  for peer in $peers; do
    echo "-------------------------------- $peer ------------------------------------------"
    docker exec -i $peer bash -c "peer chaincode install -n geodb -v ${version} -p \github.com/geodb/go/"
    check_returnCode $?
    echo "-------------------------------- $peer upgraded GO chaincode -----------------------------------"
    peer=$peer+1
  done 
  
  # docker exec -i clipeer0.operations.geodb.com bash -c "peer chaincode install -n geodb -v ${version} -p \github.com/geodb/go/"
  docker exec -i clipeer0.operations0.geodb.com bash -c "peer chaincode upgrade -o orderer0.operations0.geodb.com:7050 -C rewards -n geodb -v ${version} -c '{\"Args\":[]}'"
fi

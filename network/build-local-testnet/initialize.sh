#!/bin/bash +x

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

startRootCA(){
  echo
  echo "========================================================="
  echo "Starting Root CA"
  echo "========================================================="
  echo

  ./startRootCA.sh
}

buildCertificates(){
  echo
  echo "========================================================="
  echo "Buildng certificates"
  echo "========================================================="
  echo

  ./generate-crypto-materials.sh --orgs $1
}

genesisBlock(){
  echo
  echo "========================================================="
  echo "Generating Genesis Block"
  echo "========================================================="
  echo

  ./channel-config.sh $1
}

checkIfNetworkExists(){
  echo
  echo "========================================================="
  echo "Checking if network exists"
  echo "========================================================="
  echo

  if [ "$(docker network ls | grep ${COMPOSE_PROJECT_NAME}_geodb)" ]; then
    >&2 echo "Network already exists. Stop the network first"
    exit 1
  fi
}

bringUpNetwork(){
  echo
  echo "========================================================="
  echo "Bringing up the network"
  echo "========================================================="
  echo
  pwd
  docker-compose -f docker-compose.yaml up -d
}

operationsWithPeer(){
  echo
  echo "========================================================="
  echo $@ | cut -f2,3 -d" "
  echo "========================================================="
  echo

  docker exec clipeer0.operations.geodb.com bash -c "$@"
}

export COMPOSE_PROJECT_NAME=geodb

dir=`pwd`

checkIfNetworkExists

# Start root CA
cd ../CA
startRootCA
check_returnCode $?
sleep 1s
# Build certificates
cd ..
buildCertificates operations.geodb.com:1:1:7500:geodb:password:7501
check_returnCode $?
sleep 3s

# Generate genesis block

genesisBlock $dir
check_returnCode $?

# Bring up the network

cd $dir
bringUpNetwork
check_returnCode $?
sleep 3s

# Create the channel on the peer from the genesis block
operationsWithPeer 'peer channel create -c rewards -f ./channels/rewards.tx -o orderer0.operations.geodb.com:7050' 
check_returnCode $?

# Join the channel
operationsWithPeer 'peer channel join -b rewards.block'
check_returnCode $?

# Update anchor peer
operationsWithPeer 'peer channel update -o orderer0.operations.geodb.com:7050 -c rewards -f ./channels/geodbanchor.tx'
check_returnCode $?

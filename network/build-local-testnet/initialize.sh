#!/bin/bash

###############################################################################

# This should be a stand-alone working script.
# As such, some checks are performed before running it

if [ -z "$GDBROOT" ]; then
  echo "GDBROOT is not set as environment variable. Please set it"
  exit 1
fi

source $GDBROOT/network/global-env-vars.sh
source $GDBROOT/network/utils/utils.sh

checkMandatoryEnvironmentVariable "LOCAL_TESTNET_DIR"
checkMandatoryEnvironmentVariable "CA_ROOT_DIR"
checkMandatoryEnvironmentVariable "NETWORK_DIR"

source $LOCAL_TESTNET_DIR/local-testnet-env-vars.sh

checkMandatoryEnvironmentVariable "LOCAL_TESTNET_COMPOSE_PROJECT_NAME"

###############################################################################

# This is the summarized functionality of the script
main() {
  # Check if an old network instance exists. If it exists, it will error
  checkIfNetworkExists
  # If network does not exists, then we can continue with
  startRootCA && sleep 1s
  # If root CA was started successfully then
  buildCertificates operations.geodb.com:1:1:7500:geodb:password:7501 && sleep 3s
  # If the certificates building process succeeded, then
  generateGenesisBlock && sleep 3s
  # Once all the cryptomaterials are generated, start the docker containers
  bringUpNetwork && sleep 3s
  # With the network online, create the channel rewards
  setupRewardsChannel
}

checkIfNetworkExists(){
  printSection "Checking for older network instances"
  if [ "$(docker network ls | grep ${LOCAL_TESTNET_COMPOSE_PROJECT_NAME}_geodb)" ]; then
    fatal "Network already exists. Stop the network first"
  else
    printInfo "There are no network instances, the process continues"
  fi
}

startRootCA() {
  . $CA_ROOT_DIR/startRootCA.sh
  checkFatalError $?
}

buildCertificates(){
  printSection "Building certificates"
  pushd $NETWORK_DIR
  . generate-crypto-materials.sh --orgs $1
  checkFatalError $?
  popd
}

generateGenesisBlock(){
  printSection "Genesis block"
  pushd $NETWORK_DIR
  . channel-config.sh $LOCAL_TESTNET_DIR
  checkFatalError $?
  popd
}

bringUpNetwork(){
  printSection "Bringing up the network"
  COMPOSE_PROJECT_NAME=$LOCAL_TESTNET_COMPOSE_PROJECT_NAME \
    docker-compose --file $LOCAL_TESTNET_DIR/docker-compose.yaml up -d
  checkFatalError $?
}

setupRewardsChannel() {
  printSection "Configuring rewards channel"

  operationsWithPeer clipeer0.operations.geodb.com \
    'peer channel create -c rewards -f ./channels/rewards.tx -o orderer0.operations.geodb.com:7050'

  operationsWithPeer clipeer0.operations.geodb.com 'peer channel join -b rewards.block'

  operationsWithPeer clipeer0.operations.geodb.com \
    'peer channel update -o orderer0.operations.geodb.com:7050 -c rewards -f ./channels/geodbanchor.tx'
}

operationsWithPeer(){
  printSection `$@ | cut -f2,3 -d" "`
  docker exec clipeer0.operations.geodb.com bash -c "$@"
  checkFatalError $?
}


main

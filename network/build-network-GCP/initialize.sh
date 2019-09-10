#!/bin/bash +x

source ./env-vars

. utils/utils.sh

export COMPOSE_PROJECT_NAME=geodb

dir=`pwd`

# Set project testing at GCP

gcloud config set project $PROJECT

checkIfNetworkExists

# Start root CA

checkSomeCA
sleep 2s

# Build certificates

getCertsCA
check_returnCode $?

introduceIP

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

echo
echo "========================================================="
echo "You can deploy automatically default chaincode"
echo "========================================================="
echo

cd ..

while true; do
    read -p "Do you want to deploy default chaincode? " yn
    case $yn in
     [Yy]* ) installChaincode; check_returnCode $?; break;;
     [Nn]* ) echo "Federation is ready."; break;;
     *) echo "Please answer local (Ll) or GCP (Gg).";
    esac
done
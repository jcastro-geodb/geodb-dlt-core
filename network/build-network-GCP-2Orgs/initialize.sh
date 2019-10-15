#!/bin/bash +x

source ./env-vars
source ../env-vars

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

#getCertsCA
#check_returnCode $?

#introduceIP

cd ..
buildCertificates #orderer.geodb.com:0:5:7500:geodb:password:7501
check_returnCode $?
sleep 3s

# buildCertificates operations0.geodb.com:4:0:7500:geodb:password:7501
# check_returnCode $?

# buildCertificates operations1.geodb.com:4:0:7500:geodb:password:7501
# check_returnCode $?

# Generate genesis block

genesisBlock $dir $ORGSTYPE
check_returnCode $?

# Bring up the network

cd $dir
# bringUpNetwork
# check_returnCode $?
# sleep 3s

# # Create the channel on the peer from the genesis block
# operationsWithPeer 'peer channel create -c rewards -f ./channels/rewards.tx -o orderer0.orderer.geodb.com:7050' 
# check_returnCode $?

# # Join the channel

# echo
# echo "========================================================="
# echo "Joinning Channel"
# echo "========================================================="
# echo

# peers=$(docker ps --format '{{.Names}}' | grep clipeer)

# for peer in $peers; do
#   echo "-------------------------------- $peer ------------------------------------------"
#   docker exec $peer bash -c 'peer channel join -b rewards.block'
#   check_returnCode $?
#   echo "-------------------------------- $peer joined -----------------------------------"
#   peer=$peer+1
# done

# # Update anchor peer
# docker exec clipeer0.operations0.geodb.com bash -c 'peer channel update -o orderer0.orderer.geodb.com:7050 -c rewards -f ./channels/geodbanchor.tx'
# check_returnCode $?

# docker exec clipeer0.operations1.geodb.com bash -c 'peer channel update -o orderer0.orderer.geodb.com:7050 -c rewards -f ./channels/geodbanchor2.tx'
# check_returnCode $?
# # docker exec clipeer0.operations1.geodb.com bash -c 'peer channel update -o orderer1.operations1.geodb.com:7150 -c rewards -f ./channels/geodbanchor.tx'

# echo
# echo "========================================================="
# echo "You can deploy automatically default chaincode"
# echo "========================================================="
# echo

# cd ..

# while true; do
#     read -p "Do you want to deploy default chaincode? " yn
#     case $yn in
#      [Yy]* ) installChaincode $ORGSTYPE; check_returnCode $?; break;;
#      [Nn]* ) echo "Federation is ready."; break;;
#      *) echo "Please answer local (Ll) or GCP (Gg).";
#     esac
# done

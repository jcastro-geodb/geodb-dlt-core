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
echo "-------------->>>>>>>>>>>>>>>>>>>>> ORDERER"
buildCertificates orderer:orderer.geodb.com:7500:7501:5
check_returnCode $?
sleep 3s
echo "-------------->>>>>>>>>>>>>>>>>>>>> OP0"
buildCertificates peer:operations0.geodb.com:7500:7502:4
check_returnCode $?
echo "-------------->>>>>>>>>>>>>>>>>>>>> OP1"
buildCertificates peer:operations1.geodb.com:7500:7503:4
check_returnCode $?

# Generate genesis block

genesisBlock $dir $ORGSTYPE
check_returnCode $?

# Bring up the network

cd $dir
bringUpNetwork
check_returnCode $?
sleep 10s

# # Create the channel on the peer from the genesis block
operationsWithPeer 'peer channel create -c rewards -f ./channels/rewards.tx -o orderer0.orderer.geodb.com:7050 --tls --cafile /etc/hyperledger/crypto/ordererOrganizations/orderer.geodb.com/orderers/orderer0.orderer.geodb.com/msp/tlscacerts/tlsca.orderer.geodb.com-cert.pem --clientauth --certfile /etc/hyperledger/crypto/peerOrganizations/operations0.geodb.com/peers/peer0.operations0.geodb.com/tls/server.crt --keyfile /etc/hyperledger/crypto/peerOrganizations/operations0.geodb.com/peers/peer0.operations0.geodb.com/tls/server.key' 
check_returnCode $?

# Join the channel

echo
echo "========================================================="
echo "Joinning Channel"
echo "========================================================="
echo

peers=$(docker ps --format '{{.Names}}' | grep clipeer)

for peer in $peers; do
  echo "-------------------------------- $peer ------------------------------------------"
  docker exec $peer bash -c 'peer channel join -b rewards.block --tls --cafile /etc/hyperledger/crypto/peerOrganizations/operations0.geodb.com/peers/peer0.operations0.geodb.com/msp/tlscacerts/tlsca.operations0.geodb.com-cert.pem'
  check_returnCode $?
  echo "-------------------------------- $peer joined -----------------------------------"
  peer=$peer+1
done

# Update anchor peer
docker exec clipeer0.operations0.geodb.com bash -c 'peer channel update -o orderer0.orderer.geodb.com:7050 -c rewards -f ./channels/geodbanchor.tx --tls --cafile /etc/hyperledger/crypto/ordererOrganizations/orderer.geodb.com/orderers/orderer0.orderer.geodb.com/msp/tlscacerts/tlsca.orderer.geodb.com-cert.pem --clientauth --certfile /etc/hyperledger/crypto/peerOrganizations/operations0.geodb.com/peers/peer0.operations0.geodb.com/tls/server.crt --keyfile /etc/hyperledger/crypto/peerOrganizations/operations0.geodb.com/peers/peer0.operations0.geodb.com/tls/server.key'
check_returnCode $?

docker exec clipeer0.operations1.geodb.com bash -c 'peer channel update -o orderer0.orderer.geodb.com:7050 -c rewards -f ./channels/geodbanchor2.tx --tls --cafile /etc/hyperledger/crypto/ordererOrganizations/orderer.geodb.com/orderers/orderer0.orderer.geodb.com/msp/tlscacerts/tlsca.orderer.geodb.com-cert.pem --clientauth --certfile /etc/hyperledger/crypto/peerOrganizations/operations0.geodb.com/peers/peer0.operations0.geodb.com/tls/server.crt --keyfile /etc/hyperledger/crypto/peerOrganizations/operations0.geodb.com/peers/peer0.operations0.geodb.com/tls/server.key'
check_returnCode $?
# docker exec clipeer0.operations1.geodb.com bash -c 'peer channel update -o orderer1.operations1.geodb.com:7150 -c rewards -f ./channels/geodbanchor.tx'

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

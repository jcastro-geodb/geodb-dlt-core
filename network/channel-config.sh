#!/bin/bash +x

if [ ! -d "./orderer" ]; then
  echo "Spawning ./orderer directory"
  mkdir orderer
fi

if [ ! -d "./channels" ]; then
  echo "Spawning ./channels directory"
  mkdir channels
fi

if [ ! -d "./chaincode" ]; then
  echo "Spawning ./chaincode directory"
  mkdir chaincode
fi

CONFIG_PATH=$1

if [ -z "$CONFIG_PATH" ]; then
  CONFIG_PATH=./
fi

export FABRIC_CFG_PATH=$CONFIG_PATH

echo
echo "##################################################################"
echo "#######    Generating orderer genesis block             ##########"
echo "##################################################################"
echo
configtxgen -profile GeoDBOrdererGenesis -outputBlock ./orderer/genesis.block -channelID systemchannel

echo
echo "##################################################################"
echo "####### Generating orderer rewards channel genesis block #########"
echo "##################################################################"
echo
configtxgen -profile RewardsChannel -outputCreateChannelTx ./channels/rewards.tx -channelID rewards


echo
echo "##################################################################"
echo "####### Setting GeoDB anchor peer for the channel       ##########"
echo "##################################################################"
echo
configtxgen -profile RewardsChannel -outputAnchorPeersUpdate ./channels/geodbanchor.tx -channelID rewards -asOrg GeoDB

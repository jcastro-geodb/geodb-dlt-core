#!/bin/bash +x

check_returnCode() {
        if [ $1 -eq 0 ]; then
                echo -e "INFO:.... Proccess Succeed"
        else
                >&2 echo -e "ERROR:.... Proccess ERROR: $1"
                cd $dir
                ./build-local-testnet/reset.sh
                echo -e "INFO: System has been reloaded to stable previous point. However, please check errors, check if system has been properly reloaded and retry if it's ok..."
                exit $1
        fi
}

checkIfExists(){
  if [ ! -d "$1" ]; then
    echo "Spawning $1 directory"
    mkdir $1
  fi
}

checkIfExists ./orderer
check_returnCode $?

checkIfExists ./channels
check_returnCode $?

checkIfExists ./chaincode
check_returnCode $?

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
check_returnCode $?

echo
echo "##################################################################"
echo "####### Generating orderer rewards channel genesis block #########"
echo "##################################################################"
echo
configtxgen -profile RewardsChannel -outputCreateChannelTx ./channels/rewards.tx -channelID rewards
check_returnCode $?

echo
echo "##################################################################"
echo "####### Setting GeoDB anchor peer for the channel       ##########"
echo "##################################################################"
echo
configtxgen -profile RewardsChannel -outputAnchorPeersUpdate ./channels/geodbanchor.tx -channelID rewards -asOrg GeoDB
check_returnCode $?

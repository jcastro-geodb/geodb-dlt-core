#!/bin/bash +x

source $GDBROOT/network/global-env-vars.sh
source $GDBROOT/network/utils/utils.sh
checkMandatoryEnvironmentVariable "NETWORK_DIR"

source $NETWORK_DIR/env-vars

mkdirIfNotExists $NETWORK_DIR/orderer
checkFatalError $?

mkdirIfNotExists $NETWORK_DIR/channels
checkFatalError $?

mkdirIfNotExists $NETWORK_DIR/chaincode
checkFatalError $?

CONFIG_PATH=$1

if [ -z "$CONFIG_PATH" ]; then
  CONFIG_PATH=$NETWORK_DIR
fi

deploy=$2

export FABRIC_CFG_PATH=$CONFIG_PATH

printSection "Generating orderer genesis block"
configtxgen -profile GeoDBOrdererGenesis \
  -outputBlock $NETWORK_DIR/orderer/genesis.block \
  -channelID systemchannel
checkFatalError $?

printSection "Generating orderer rewards channel genesis block"
configtxgen -profile RewardsChannel \
  -outputCreateChannelTx $NETWORK_DIR/channels/rewards.tx \
  -channelID rewards
checkFatalError $?

printSection "Generating private ethereum channel"
configtxgen -profile NodePrivateChannel \
  -outputCreateChannelTx $NETWORK_DIR/channels/nodeprivatech.tx \
  -channelID nodeprivatech
checkFatalError $?

printSection "Setting GeoDB anchor peer for the channel"
configtxgen -profile RewardsChannel \
  -outputAnchorPeersUpdate $NETWORK_DIR/channels/geodbanchor.tx \
  -channelID rewards -asOrg GeoDB
checkFatalError $?

if [ "$deploy" == "$ORGSTYPE" ]; then
  configtxgen -profile RewardsChannel -outputAnchorPeersUpdate $NETWORK_DIR/channels/geodbanchor2.tx -channelID rewards -asOrg GeoDB2
  checkFatalError $?
fi

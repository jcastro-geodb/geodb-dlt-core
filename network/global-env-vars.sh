# Main paths
export GUI_DIR=$GDBROOT/client
export ETH_DIR=$GDBROOT/ethereum
export NETWORK_DIR=$GDBROOT/network

# Fabric tools
export HLF_CA_HOME=$(realpath $GOPATH/src/github.com/hyperledger/fabric-ca)
export HLF_CA_CLIENT=$HLF_CA_HOME/bin/fabric-ca-client
export HLF_CA_SERVER=$HLF_CA_HOME/bin/fabric-ca-server

# Other useful paths
export CRYPTO_CONFIG_DIR=$NETWORK_DIR/crypto-config
export CA_ROOT_DIR=$NETWORK_DIR/CA
export LOCAL_TESTNET_DIR=$NETWORK_DIR/build-local-testnet

# COMPOSE PROJECT NAMES
export CA_ROOT_COMPOSE_PROJECT_NAME=CA

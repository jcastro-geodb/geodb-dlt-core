# Main paths
export GUI_DIR=$(realpath $GDBROOT/client)
export ETH_DIR=$(realpath $GDBROOT/ethereum)
export NETWORK_DIR=$(realpath $GDBROOT/network)

# Fabric tools
export HLF_CA_HOME=$(realpath $GOPATH/src/github.com/hyperledger/fabric-ca)
export HLF_CA_CLIENT=$HLF_CA_HOME/bin/fabric-ca-client
export HLF_CA_SERVER=$HLF_CA_HOME/bin/fabric-ca-server

# Other useful paths
export CRYPTO_CONFIG_DIR=$(realpath $NETWORK_DIR/crypto-config)
export CA_ROOT_DIR=$(realpath $NETWORK_DIR/CA)
export LOCAL_TESTNET_DIR=$(realpath $NETWORK_DIR/build-local-testnet)

# COMPOSE PROJECT NAMES
export CA_ROOT_COMPOSE_PROJECT_NAME=CA

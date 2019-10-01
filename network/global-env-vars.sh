# Main paths
GUI_DIR=$(realpath $GDBROOT/client)
ETH_DIR=$(realpath $GDBROOT/ethereum)
NETWORK_DIR=$(realpath $GDBROOT/network)

# Fabric requirements
HFA_CA_HOME=$(realpath $GOPATH/src/github.com/hyperledger/fabric-ca)
HFA_CA_CLIENT=$(realpath $HFA_CA_HOME/bin/fabric-ca-client)
HFA_CA_SERVER=$(realpath $HFA_CA_HOME/bin/fabric-ca-server)

# Other useful paths
CRYPTO_CONFIG_DIR=$(realpath $NETWORK_DIR/crypto-config)
CA_ROOT_DIR=$(realpath $NETWORK_DIR/CA)
LOCAL_TESTNET_DIR=$(realpath $NETWORK_DIR/build-local-testnet)

# COMPOSE PROJECT NAMES
CA_ROOT_COMPOSE_PROJECT_NAME=CA

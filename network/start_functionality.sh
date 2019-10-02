# !/bin/bash

export COMPOSE_PROJECT_NAME=node

DOCKER_FILE=$1

function printHelp() {
  echo "Usage: "
  echo "  start.sh <mode> "
  echo "    <mode> - one of 'local', '1Org', '2Orgs' or 'restart'"
  echo "      - 'local' - bring up the network local mode"
  echo "      - '1Orgs' - bring up the network with CA root in GCP instance and 1 Organization with: 1 orderer, 1 peer"
  echo "      - '2Orgs' - bring up the network with CA root in GCP instance and 2 Organizations with: 1 orderer, 4 peer each one"
  echo "      - 'restart' - restart the network"
  echo "  start -h (print this message)"
}

MODE=$1

if [ "$MODE" == "local" ]; then
  echo "Running local deployment"
  cd ./build-local-testnet
  ./initialize.sh
elif [ "$MODE" == "1Org" ]; then
  echo "Running basic CA root GCP deployment"
  cd ./build-network-GCP
  ./initialize.sh
elif [ "$MODE" == "2Orgs" ]; then
  echo "Running basic CA root GCP deployment"
  cd ./build-network-GCP-2Orgs
  ./initialize.sh
elif [ "$MODE" == "restart" ]; then
  echo "Restarting"
  cd ./build-network-GCP-2Orgs
  ./restart.sh
else
  printHelp
  exit 1
fi
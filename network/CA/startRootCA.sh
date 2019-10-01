# !/bin/bash

source $GDBROOT/network/utils/utils.sh
checkMandatoryEnvironmentVariable "CA_ROOT_DIR"
checkMandatoryEnvironmentVariable "CA_ROOT_COMPOSE_PROJECT_NAME"

printSection "Starting root certificate authority"

if [ ! -d "$CA_ROOT_DIR/fabric-ca-server" ]; then
  echo "Spawning ./fabric-ca-server directory"
  mkdir $CA_ROOT_DIR/fabric-ca-server
  mkdir $CA_ROOT_DIR/fabric-ca-server/msp
  mkdir $CA_ROOT_DIR/fabric-ca-server/msp/cacerts
  mkdir $CA_ROOT_DIR/fabric-ca-server/msp/keystore
  mkdir $CA_ROOT_DIR/fabric-ca-server/msp/signcerts
  mkdir $CA_ROOT_DIR/fabric-ca-server/msp/user
fi


if [ ! "$(docker ps -q -f name=ca-root.geodb.com)" ]; then
  if [ "$(docker ps -aq -f status=exited -f name=ca-root.geodb.com)" ]; then
      # cleanup
      printInfo "Cleaning up"
      COMPOSE_PROJECT_NAME=$CA_ROOT_COMPOSE_PROJECT_NAME docker rm ca-root.geodb.com --force
  fi
  COMPOSE_PROJECT_NAME=$CA_ROOT_COMPOSE_PROJECT_NAME docker-compose --file $CA_ROOT_DIR/docker-compose.yaml up -d
else
  printInfo "Root CA is already running"
fi

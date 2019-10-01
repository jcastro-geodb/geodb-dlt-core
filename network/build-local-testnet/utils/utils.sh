#!/bin/bash +x

bringUpNetwork(){
  COMPOSE_PROJECT_NAME=$LOCAL_TESTNET_COMPOSE_PROJECT_NAME \
    docker-compose --file $LOCAL_TESTNET_DIR/docker-compose.yaml up -d
}

# !/bin/bash
# export COMPOSE_PROJECT_NAME=geodb

# echo "$COMPOSE_PROJECT_NAME"

if [ ! -d "./fabric-ca-server" ]; then
  echo "Spawning ./fabric-ca-server directory"
  mkdir fabric-ca-server
  mkdir fabric-ca-server/msp
  mkdir fabric-ca-server/msp/cacerts
  mkdir fabric-ca-server/msp/keystore
  mkdir fabric-ca-server/msp/signcerts
  mkdir fabric-ca-server/msp/user
fi

if [ ! "$(docker ps -q -f name=ca-root.geodb.com)" ]; then
  if [ "$(docker ps -aq -f status=exited -f name=ca-root.geodb.com)" ]; then
      # cleanup
      echo "Cleaning up"
      COMPOSE_PROJECT_NAME="CA" docker rm ca-root.geodb.com
  fi
  # run your container
  echo "Starting GeoDB Root CA"
  COMPOSE_PROJECT_NAME="CA" docker-compose -f docker-compose.yaml up -d
else
  echo "Root CA is running"
fi

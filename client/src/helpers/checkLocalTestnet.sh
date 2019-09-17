#!/bin/bash
CONTAINER_IDS=$(docker ps -aq -f "status=running" -f "name=operations.geodb.com")

if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" = " " ]; then
  >&2 echo "Local testnet is not running"
  # cd ../../../network/build-local-testnet
  # ./initialize.sh
  exit 1
else
  echo "Containers are running"
  exit 0
fi

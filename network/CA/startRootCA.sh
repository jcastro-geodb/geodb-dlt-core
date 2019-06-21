# !/bin/bash

if [ ! "$(docker ps -q -f name=ca-root.geodb.com)" ]; then
  if [ "$(docker ps -aq -f status=exited -f name=ca-root.geodb.com)" ]; then
      # cleanup
      echo "Cleaning up"
      docker rm ca-root.geodb.com
  fi
  # run your container
  echo "Starting GeoDB Root CA"
  docker-compose -f docker-compose.yaml up -d
else
  echo "Root CA is running"
fi

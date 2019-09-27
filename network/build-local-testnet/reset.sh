# !/bin/bash

export COMPOSE_PROJECT_NAME=geodb

check_returnCode() {
        if [ $1 -eq 0 ]; then
                echo -e "INFO:.... El proceso se ha ejecutado con éxito"
        else
                >&2 echo -e "ERROR:.... El proceso se ha ejecutado con error: $1"
                echo -e "INFO:Saliendo..."
                exit $1
        fi
}

# Remove docker containers created after the testnet and their artifacts
removeNodeArtifacts() {
  echo
  echo "========================================================="
  echo "Killing docker containers defined in /node-artifacts/local"
  echo "========================================================="
  echo

  sleep 2s

  while [ -d "$(find ../node-artifacts/local -maxdepth 1 -mindepth 1 -type d  | head -1)" ]; do

    composeDir="$(find ../node-artifacts/local -maxdepth 1 -mindepth 1 -type d  | head -1)"
    dirname="${DOCKER_FILE%"${DOCKER_FILE##*[!/]}"}"
    dirname="${result##*/}"

    COMPOSE_PROJECT_NAME=$dirname docker-compose -f $composeDir/node-docker-compose.yaml down --remove-orphans \
    && COMPOSE_PROJECT_NAME=$dirname docker-compose -f $composeDir/node-docker-compose.yaml kill


    if [ $? -ne 0 ]; then
      echo "ERROR: Could not stop containers defined in $composeDir, skipping further deletions"
      return 1
    fi

    rm -rf $composeDir

    if [ $? -ne 0 ]; then
      echo "ERROR: Could not delete directory $composeDir, skipping further deletions"
      return 1
    fi

  done
}

# Remove the basic (operations.geodb.com) containers that bootstrap the network
removeLocalTestnetBaseContainers() {
  echo
  echo "========================================================="
  echo "Killing base docker containers"
  echo "========================================================="
  echo

  sleep 2s

  docker-compose -f docker-compose.yaml down --remove-orphans && docker-compose -f docker-compose.yaml kill

}

regenerateCryptoMaterial(){
  echo
  echo "========================================================="
  echo "Restoring Crypto material. Stapping All CAs en cleanning up"
  echo "========================================================="
  echo

  cd ../
  ./generate-crypto-materials.sh -d
}

cleanDirectories(){
  echo
  echo "========================================================="
  echo "Cleanning directories"
  echo "========================================================="
  echo

  if [ -d "./channels" ]; then
    echo "Removing ./channels"
    rm -rf rm -rf ./channels
  fi

  if [ -d "./orderer" ]; then
    echo "Removing ./orderer"
    rm -rf rm -rf ./orderer
  fi

  if [ -d "./configtxlator-artifacts" ]; then
    echo "Removing ./configtxlator-artifacts"
    rm -rf rm -rf ./configtxlator-artifacts
  fi
}

restoreCA(){
  echo
  echo "========================================================="
  echo "Restoring CA"
  echo "========================================================="
  echo

  cd ./CA
  COMPOSE_PROJECT_NAME=CA docker-compose -f docker-compose.yaml kill && \
  COMPOSE_PROJECT_NAME=CA docker-compose -f docker-compose.yaml down

  if [ -d "./fabric-ca-server" ]; then
    echo "Removing ./CA/fabric-ca-server"
    rm -rf ./fabric-ca-server
  fi
}

removeNodeArtifacts
check_returnCode $?

removeLocalTestnetBaseContainers
check_returnCode $?

regenerateCryptoMaterial
check_returnCode $?

cleanDirectories
check_returnCode $?

restoreCA
check_returnCode $?

echo
echo "========================================================="
echo "Your system is now prepared for new network. Good Luck!"
echo "========================================================="
echo

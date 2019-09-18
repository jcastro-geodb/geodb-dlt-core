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

downAll(){
  echo
  echo "========================================================="
  echo "Killing all dockers and reset system"
  echo "========================================================="
  echo

  sleep 2s

  docker-compose -f docker-compose.yaml kill && docker-compose -f docker-compose.yaml down --remove-orphans

  # Remove docker containers created after the testnet and remove their artifacts
  while [ -d "$(find ../node-artifacts/local -maxdepth 1 -mindepth 1 -type d  | head -1)" ]; do
    composeDir="$(find ../node-artifacts/local -maxdepth 1 -mindepth 1 -type d  | head -1)"
    docker-compose -f $composeDir/node-docker-compose.yaml kill \
    && docker-compose -f $composeDir/node-docker-compose.yaml down --remove-orphans
    rm -rf $composeDir
    if [ $? -ne 0 ]; then
      echo "ERROR: Could not delete directory $composeDir, skipping further deletions"
      break;
    fi
  done

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

  if [ -d "./node-artifacts" ]; then
    echo "Removing ./node-artifacts/local"
    rm -rf rm -rf ./node-artifacts/local
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
downAll
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

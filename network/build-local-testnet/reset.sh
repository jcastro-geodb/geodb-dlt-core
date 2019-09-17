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

  if [ -d "../node-artifacts/local" ]; then
    array=()
    while IFS=  read -r -d $'\0'; do

      echo $REPLY
      docker-compose -f $REPLY kill \
      && docker-compose -f $REPLY down --remove-orphans
    done < <(find ../node-artifacts/local -name "*docker-compose*" -print0)
  fi

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
    echo "Removing ./node-artifacts"
    rm -rf rm -rf ./node-artifacts
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

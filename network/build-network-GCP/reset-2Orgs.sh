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

  docker-compose -f docker-compose-2Orgs.yaml kill && docker-compose -f docker-compose-2Orgs.yaml down
}

clearContainers() {
  echo
  echo "========================================================="
  echo "Cleanning Containers"
  echo "========================================================="
  echo
  CONTAINER_IDS=$(docker ps -a | awk '($2 ~ /dev-peer.*.*/) {print $1}')
    if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" == " " ]; then
      echo "---- No containers available for deletion ----"
    else
      docker rm -f $CONTAINER_IDS
    fi
}

removeUnwantedImages() { 
  echo
  echo "========================================================="
  echo "Removing Unwanted Images"
  echo "========================================================="
  echo
  DOCKER_IMAGE_IDS=$(docker images | awk '($1 ~ /dev-peer.*.*/) {print $3}')
    if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" == " " ]; then
      echo "---- No images available for deletion ----"
    else
      docker rmi -f $DOCKER_IMAGE_IDS
    fi
}

regenerateCryptoMaterial(){
  echo
  echo "========================================================="
  echo "Restoring Crypto material. Stapping All CAs en cleanning up"
  echo "========================================================="
  echo

  cd ../
  ./generate-crypto-materials-GCP.sh -d
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
}

downCA(){
  echo
  echo "========================================================="
  echo "Killing all dockers and reset system"
  echo "========================================================="
  echo

  sleep 2s

  terraform init
  terraform destroy -var-file="./secret/secret.tfvars" -auto-approve
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

downCA
check_returnCode $?

downAll
check_returnCode $?

clearContainers
check_returnCode $?

removeUnwantedImages
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
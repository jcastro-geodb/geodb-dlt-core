#!/bin/bash +x

source ./env-vars

check_returnCode() {
        if [ $1 -eq 0 ]; then
                echo -e "INFO:.... Proccess Succeed"
        else
                >&2 echo -e "ERROR:.... Proccess ERROR: $1"
		cd $dir
		./reset.sh
		echo -e "INFO: System has been reloaded to stable previous point. However, please check errors, check if system has been properly reloaded and retry if it's ok..."
                exit $1
        fi
}

startRootCA(){
  echo
  echo "========================================================="
  echo "Starting Root CA"
  echo "========================================================="
  echo

  terraform init
  terraform apply -var-file="./secret/secret.tfvars" -auto-approve
}

checkSomeCA(){
  echo
  echo "========================================================="
  echo "Checking if exists some CA active at GCP"
  echo "========================================================="
  echo

  instances=$(gcloud compute instances list | grep ca-root)

  if [ -z "$instances" ]; then
    echo "Any rootCA has been detected, deployment in proccess"
    startRootCA
  else
    echo "A rootCA has been detected, skipping this step"
  fi

}

getCertsCA(){
  echo
  echo "========================================================="
  echo "Waiting for FabricCA server. Please Wait"
  echo "========================================================="
  echo

  instanceName=$(gcloud compute instances list --filter=labels.hl-f:ca-root --format="value(name.scope())")

  sleep 120s

  echo
  echo "========================================================="
  echo "Downloading cert, please insert passphrase."
  echo "========================================================="
  echo

  mkdir -p ../$DESTCERTFILE

  gcloud compute scp $instanceName:$CERTFILE ../$DESTCERTFILE   #### CAMBIAR PARA SUBIR A STORAGE -- ES NECESARIO GENERAR POLÍTICAS DE IAM

}

introduceIP(){
  instanceIP=$(gcloud compute instances list --filter=labels.hl-f:ca-root --format="value(networkInterfaces.accessConfigs.natIP)")
  echo
  echo "========================================================="
  echo "Download complete"
  echo "========================================================="
  echo
  echo
  echo "========================================================="
  echo "FabricCA should be recognized by the host. Edit your hosts file to add this."
  echo "IP address --> $instanceIP"
  echo "Host Name --> ca-root.geodb.com"
  echo "========================================================="
  echo

  while true; do
    read -p "Have you edit your host file?" yn
    case $yn in
        [Yy]* ) echo "Thanks, procceed"; break;;
        [Nn]* ) exit;;
        * ) echo "Please answer yes (Yy) or no (Nn).";;
    esac
  done

}

buildCertificates(){
  echo
  echo "========================================================="
  echo "Buildng certificates"
  echo "========================================================="
  echo

  ./generate-crypto-materials-GCP.sh --orgs $1
}

genesisBlock(){
  echo
  echo "========================================================="
  echo "Generating Genesis Block"
  echo "========================================================="
  echo

  ./channel-config.sh $1
}

checkIfNetworkExists(){
  echo
  echo "========================================================="
  echo "Checking if network exists"
  echo "========================================================="
  echo

  if [ "$(docker network ls | grep ${COMPOSE_PROJECT_NAME}_geodb)" ]; then
    >&2 echo "Network already exists. Stop the network first"
    exit 1
  fi
}

bringUpNetwork(){
  echo
  echo "========================================================="
  echo "Bringing up the network"
  echo "========================================================="
  echo
  pwd
  docker-compose -f docker-compose.yaml up -d
}

operationsWithPeer(){
  echo
  echo "========================================================="
  echo $@ | cut -f2,3 -d" "
  echo "========================================================="
  echo

  docker exec clipeer0.operations0.geodb.com bash -c "$@"
}

installChaincode(){
  echo
  echo "========================================================="
  echo "Installing ChainCode"
  echo "========================================================="
  echo

  ./install-upg-chaincode.sh

}

export COMPOSE_PROJECT_NAME=geodb

dir=`pwd`

# Set project testing at GCP

gcloud config set project $PROJECT

checkIfNetworkExists

# Start root CA

checkSomeCA
sleep 2s

# Build certificates

getCertsCA
check_returnCode $?

introduceIP

cd ..
buildCertificates operations0.geodb.com:4:1:7500:geodb:password:7501
check_returnCode $?
sleep 3s

buildCertificates operations1.geodb.com:4:1:7500:geodb:password:7501
check_returnCode $?

# Generate genesis block

genesisBlock $dir
check_returnCode $?

# Bring up the network

cd $dir
bringUpNetwork
check_returnCode $?
sleep 3s

# Create the channel on the peer from the genesis block
operationsWithPeer 'peer channel create -c rewards -f ./channels/rewards.tx -o orderer0.operations0.geodb.com:7050' 
check_returnCode $?

# Join the channel

echo
echo "========================================================="
echo "Joinning Channel"
echo "========================================================="
echo

peers=$(docker ps --format '{{.Names}}' | grep clipeer)

for peer in $peers; do
  echo "-------------------------------- $peer ------------------------------------------"
  docker exec $peer bash -c 'peer channel join -b rewards.block'
  check_returnCode $?
  echo "-------------------------------- $peer joined -----------------------------------"
  peer=$peer+1
done

# Update anchor peer
operationsWithPeer 'peer channel update -o orderer0.operations0.geodb.com:7050 -c rewards -f ./channels/geodbanchor.tx'
check_returnCode $?

docker exec clipeer0.operations1.geodb.com bash -c 'peer channel update -o orderer0.operations0.geodb.com:7050 -c rewards -f ./channels/geodbanchor2.tx'

# docker exec clipeer0.operations1.geodb.com bash -c 'peer channel update -o orderer1.operations1.geodb.com:7150 -c rewards -f ./channels/geodbanchor.tx'

echo
echo "========================================================="
echo "You can deploy automatically default chaincode"
echo "========================================================="
echo

cd ..

while true; do
    read -p "Do you want to deploy default chaincode? " yn
    case $yn in
     [Yy]* ) installChaincode; check_returnCode $?; break;;
     [Nn]* ) echo "Federation is ready."; break;;
     *) echo "Please answer local (Ll) or GCP (Gg).";
    esac
done
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
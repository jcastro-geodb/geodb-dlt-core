##############################################################
###             AUXILIAR FUNCTION FOR GENERAL PURPOSE      ### 
##############################################################

successPrint(){
  echo -e "$SUCCESS[SUCCESS]:$@$NC"
}

infoPrint(){
  echo -e "$INFO[INFO]:$@$NC"
}

infoStage(){
  echo -e "$INFO*********************************************************************************"
  echo -e "******           $@"
  echo -e "*********************************************************************************$NC"
}

function fatal {
   echo -e "$FATAL FATAL: $*$NC"
   exit 1
}

##############################################################
###             AUXILIAR FUNCTION FOR ORGS GENERATING      ### 
##############################################################

check_returnCode() {
        if [ $1 -eq 0 ]; then
                echo -e "INFO:.... Proccess Succeed"
        else
                >&2 echo -e "ERROR:.... Proccess ERROR: $1"
		cd $dir
		#./reset.sh
		echo -e "INFO: System has been reloaded to stable previous point. However, please check errors, check if system has been properly reloaded and retry if it's ok..."
                exit $1
        fi
}

startRootCA(){

  infoStage 'Starting Root CA'

  terraform init
  terraform apply -var-file="./secret/secret.tfvars" -auto-approve
}

checkSomeCA(){
  infoStage 'Checking if exists some CA active at GCP'

  instances=$(gcloud compute instances list | grep ca-root)

  if [ -z "$instances" ]; then
    echo "Any rootCA has been detected, deployment in proccess"
    startRootCA
    getCertsCA 1
  else
    echo "A rootCA has been detected, skipping this step"
    getCertsCA 0
  fi

}

getCertsCA(){

  wait=$1
  
  instanceName=$(gcloud compute instances list --filter=labels.hl-f:ca-root --format="value(name.scope())")

  if [ $wait == 1 ]; then
    infoStage 'Waiting for FabricCA server. Please Wait'
    sleep 120s
  fi 

  infoStage 'Downloading cert, please insert passphrase.'

  mkdir -p ../$DESTCERTFILE
  mkdir -p ../$DOWNLOADSCERTFILES

  gcloud compute scp $instanceName:$CERTFILE ../$DESTCERTFILE   #### CAMBIAR PARA SUBIR A STORAGE -- ES NECESARIO GENERAR POLÍTICAS DE IAM
  gcloud compute scp $instanceName:$CERTFILE ../$DOWNLOADSCERTFILES
  gcloud compute scp $instanceName:$CACERTFILE ../$DOWNLOADSCERTFILES
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
  infoStage 'Buildng Orderer  certificates'

  ./generate-crypto-materials-GCP_RAFT.sh --orgs $1

}

genesisBlock(){
  infoStage 'Generating Genesis Block and channels artifacts'

  ./channel-config.sh $1 $2
}

checkIfNetworkExists(){
  infoStage 'Checking if network exists'

  if [ "$(docker network ls | grep ${COMPOSE_PROJECT_NAME}_geodb)" ]; then
    >&2 echo "Network already exists. Stop the network first"
    exit 1
  fi
}

bringUpNetwork(){
  infoStage 'Bringing up the network'
  pwd
  docker-compose -f docker-compose-orderer.yaml -f docker-compose-orderer-RAFT.yaml -f docker-compose.yaml up -d
}

operationsWithPeer(){
  echo
  echo "========================================================="
  echo $@ | cut -f2,3 -d" "
  echo "========================================================="
  echo

  docker exec clipeer0.operations0.geodb.com bash -c "$@"
}

operationsWithPeerOp1(){
  echo
  echo "========================================================="
  echo $@ | cut -f2,3 -d" "
  echo "========================================================="
  echo

  docker exec clipeer0.operations1.geodb.com bash -c "$@"
}

joinChannel(){
   infoStage 'Joinning Channel'
   peers=$(docker ps --format '{{.Names}}' | grep clipeer)

   for peer in $peers; do
      infoPrint 'Joinning peer '$peer
      docker exec $peer bash -c 'peer channel join -b rewards.block --tls --cafile /etc/hyperledger/crypto/peerOrganizations/operations0.geodb.com/peers/peer0.operations0.geodb.com/msp/tlscacerts/tlsca.operations0.geodb.com-cert.pem'
      check_returnCode $?
      successPrint $peer' Joinned to channel'
      peer=$peer+1
   done
}

installChaincode(){
  infoStage 'Installing ChainCode'

  ./install-upg-chaincode.sh $1

}

##############################################################
###             AUXILIAR FUNCTION FOR CERTS GENERATING     ### 
##############################################################

# Check and build executables as needed
function checkExecutables {
   if [ ! -d $FCAHOME ]; then
      fatal "Directory does not exist: $FCAHOME"
   fi
   if [ ! -x $SERVER ]; then
      dir=`pwd`
      cd $FCAHOME
      make fabric-ca-server
      if [ $? -ne 0 ]; then
         fatal "Failed to build $SERVER"
      fi
   fi
   if [ ! -x $CLIENT ]; then
      dir=`pwd`
      cd $FCAHOME
      make fabric-ca-client
      if [ $? -ne 0 ]; then
         fatal "Failed to build $CLIENT"
      fi
   fi
}

# Setup orderer and peer organizations
function setupOrgs {
   for ORG in $ORGS
   do
      setupOrg $ORG
   done
}

# Start an organization's root and intermediate CA servers
#   setupOrg <type>:<orgName>:<rootCAPort>:<intermediateCAPort>:<numNodes>
function setupOrg {
   IFSBU=$IFS
   IFS=: args=($1)
   if [ ${#args[@]} -ne 5 ]; then
      fatal "setupOrg: bad org spec: $1"
   fi
   type=${args[0]}
   orgName=${args[1]}
   orgDir=${CDIR}/${type}Organizations/${args[1]}
   rootCAPort=${args[2]}
   intermediateCAPort=${args[3]}
   numNodes=${args[4]}
   IFS=$IFSBU
   # Start the root CA server
   infoStage 'Start up Local CA for '$orgName
   startCA $orgDir/ca/root $intermediateCAPort
   # Enroll an admin user with the root CA
   infoStage 'Registering an Enrolling CA Users'
   usersDir=$orgDir/users
   adminHome=$usersDir/rootAdmin
   enroll $adminHome https://$CAUSER_NAME:$CAPASS@$CAEXT_NAME:$intermediateCAPort $orgName $PWD$LOCALSERVER_PATH$orgName$CAPUBLIC_CERT

   # Register and enroll admin with the intermediate CA
    adminUserHome=$usersDir/Admin@${orgName}
    registerAndEnroll $adminHome $adminUserHome $intermediateCAPort $orgName $CAEXT_NAME nodeAdmin admin --tls.certfiles $PWD$LOCALSERVER_PATH$orgName$CAPUBLIC_CERT
#    # Register and enroll user1 with the intermediate CA
    user1UserHome=$usersDir/User1@${orgName}
    registerAndEnroll $adminHome $user1UserHome $intermediateCAPort $orgName $CAEXT_NAME user1 user --tls.certfiles $PWD$LOCALSERVER_PATH$orgName$CAPUBLIC_CERT
#    # Create nodes (orderers or peers)
    infoStage 'Generating Local and TLS MSP for Node Users'
    nodeCount=0
    while [ $nodeCount -lt $numNodes ]; do
#       if [ $numNodes -gt 1 ]; then
          nodeDir=$orgDir/${type}s/${type}${nodeCount}.${orgName}
#       else
#          nodeDir=$orgDir/${type}s/${type}.${orgName}
#       fi
       mkdir -p $nodeDir
       # Get TLS crypto for this node
       infoPrint 'Enrolling user '${type}${nodeCount}.${orgName}' at CA TLS in order to obtain MSP TLS Certs. UserType: '$type
       tlsEnroll $nodeDir $rootCAPort $orgName ${type}${nodeCount}.${orgName} $type
#       # Register and enroll this node's identity
#       register ${type}${nodeCount}.${orgName} "secret" $nodeDir $type https://ca-root.geodb.com:$rootCAPort --tls.certfiles $PWD/CA/downloads/ca-cert.pem
       registerAndEnroll $adminHome $nodeDir $intermediateCAPort $orgName $CAEXT_NAME ${type}${nodeCount}.${orgName} $type --tls.certfiles $PWD$LOCALSERVER_PATH$orgName$CAPUBLIC_CERT
#       normalizeMSP $nodeDir $orgName $adminUserHome
       nodeCount=$(expr $nodeCount + 1)
    done
#    # Get CA certs from intermediate CA
    infoStage "Getiting CA Certs"
    getcacerts $orgDir https://$CAUSER_NAME:$CAPASS@$CAEXT_NAME:$intermediateCAPort
#    # Rename MSP files to names expected by end-to-end
    infoStage "Normalizing MSP"
    normalizeMSP $orgDir $orgName $adminUserHome
    normalizeMSP $adminHome $orgName
    normalizeMSP $adminUserHome $orgName
    normalizeMSP $user1UserHome $orgName

    nodeCount=0
    while [ $nodeCount -lt $numNodes ]; do
      nodeDir=$orgDir/${type}s/${type}${nodeCount}.${orgName}
      nodeCount=$(expr $nodeCount + 1)
      cp -r $orgDir/msp/admincerts/ $nodeDir/msp/
    done
}

# Start a root CA server:
#    startCA <homeDirectory> <listeningPort> <orgName>
# Start an intermediate CA server:
#    startCA <homeDirectory> <listeningPort> <orgName> <parentURL>
function startCA {
   homeDir=$1
   interPort=$2

   infoPrint 'Starting local CA Server for local MSP Certs generation'
   SERVER_HOME=$PWD$LOCALSERVER_PATH$orgName CALOCAL_NAME='rca-'$orgName CAPORT=$interPort CAUSER_NAME=$CAUSER_NAME CAPASS=$CAPASS docker-compose -f $PWD/build-network-GCP-2Orgs/ca-local.yaml -p 'rca-'$orgName up -d

   if [ $? -ne 0 ]; then
      fatal "Failed to start server in $homeDir"
   fi
   successPrint "CA server's started in $homeDir on port $port ..."
   sleep 1
##   checkCA $homeDir $port
   # Get the TLS crypto for this CA ----> Only to deploy as rootCA, or if this CA need to generate TLS to entity under this.
##   tlsEnroll $homeDir $port $orgName 
}

# Make sure a CA server is running
#    checkCA <homeDirectory>
function checkCA {
   pidFile=$1/server.pid
   if [ ! -f $pidFile ]; then
      fatal  "No PID file for CA server at $1"
   fi
   pid=`cat $pidFile`
   if ps -p $pid > /dev/null
   then
      successPrint "CA server is started in $1 and listening on port $2"
   else
      fatal "CA server is not running at $1; see logs at $1/server.log"
   fi
}

# Stop all CA servers
function stopAllCAs {

   containers=$(docker ps -f name="rca*" -a -q)
   if [ $containers -eq 0 ]; then
      echo "No such a container CA found"
   else
      docker stop $container
      docker rm $container
      docker volume prune
   fi
}

# Register a new user
#    register <user> <password> <registrarHomeDir> <user_type>
function register {
   user=$1; shift
   secret=$1; shift
   userDir=$1; shift
   userType=$1; shift
   urlHostReg=$1; shift
   export FABRIC_CA_CLIENT_HOME=$userDir
   mkdir -p $userDir
   logFile=$userDir/register.log
   $CLIENT register --id.name $user --id.secret $secret --id.type $userType --id.affiliation org1 -u $urlHostReg $DEBUG $* > $logFile 2>&1
   if [ $? -ne 0 ]; then
      fatal "Failed to register $user with CA as $userDir; see $logFile"
   fi
   successPrint "Registered user $user with intermediate CA as $userDir"
}

# Enroll an identity
#    enroll <homeDir> <serverURL> <orgName> [<args>]
function enroll {
   homeDir=$1; shift
   urlHostEnr=$1; shift
   orgName=$1; shift
   certFile=$1; shift
   mkdir -p $homeDir
   export FABRIC_CA_CLIENT_HOME=$homeDir
   export FABRIC_CA_CLIENT_TLS_CERTFILES=$certFile
   logFile=$homeDir/enroll.log
   # Get an enrollment certificate
   $CLIENT enroll -u $urlHostEnr $DEBUG $* > $logFile 2>&1
   if [ $? -ne 0 ]; then
      fatal "Failed to enroll $homeDir with CA at $url; see $logFile"
   fi
   # Get a TLS certificate
   successPrint "Enrolled $homeDir with CA at $url"
}

# Register and enroll a new user
#    registerAndEnroll <registrarHomeDir> <registreeHomeDir> <serverPort> <orgName> [<userName>]
function registerAndEnroll {
   adminHome=$1; shift
   userHome=$1; shift
   port=$1; shift
   orgName=$1; shift
   url=$1; shift
   userName=$1; shift
   userType=$1; shift
   if [ "$userName" = "" ]; then
      userName=$(basename $2)
   fi
   infoPrint 'Registering and enrolling user '$userName' with type '$userType' at '$url
   register $userName "secret" $adminHome $userType https://$url:$port $*
   enroll $userHome https://${userName}:$USERCATLS_PASS@$url:$port $orgName $2
}

# Enroll to get TLS crypto material
#    tlsEnroll <homeDir> <serverPort> <orgName>
function tlsEnroll {
   homeDir=$1
   port=$2
   orgName=$3
   userNameTLS=$4
   host=$(basename $homeDir),$(basename $homeDir | cut -d'.' -f1)
   tlsDir=$homeDir/tls
   srcMSP=$tlsDir/msp
   dstMSP=$homeDir/msp
   enroll $tlsDir https://$userNameTLS:$USERCATLS_PASS@$CAROOT_NAME:$port $orgName $PWD$CAROOT_DOWNLOAD$CAPUBLIC_CERT --csr.hosts $host --enrollment.profile tls
   cp $srcMSP/signcerts/* $tlsDir/server.crt
   cp $srcMSP/keystore/* $tlsDir/server.key
   mkdir -p $dstMSP/keystore
   cp $srcMSP/keystore/* $dstMSP/keystore
   mkdir -p $dstMSP/tlscacerts
   cp $srcMSP/tlscacerts/* $dstMSP/tlscacerts/tlsca.${orgName}-cert.pem
   if [ -d $srcMSP/tlsintermediatecerts ]; then
      cp $srcMSP/tlsintermediatecerts/* $tlsDir/ca.crt
      mkdir -p $dstMSP/tlsintermediatecerts
      cp $srcMSP/tlsintermediatecerts/* $dstMSP/tlsintermediatecerts
   else
      cp $srcMSP/tlscacerts/* $tlsDir/ca.crt
   fi
   #rm -rf $srcMSP $homeDir/enroll.log $homeDir/fabric-ca-client-config.yaml
}

# Rename MSP files as is expected by the e2e example
#    normalizeMSP <home> <orgName> <adminHome>
function normalizeMSP {
   userName=$(basename $1)
   mspDir=$1/msp
   orgName=$2
   admincerts=$mspDir/admincerts
   cacerts=$mspDir/cacerts
   intcerts=$mspDir/intermediatecerts
   signcerts=$mspDir/signcerts
   cacertsfname=$cacerts/ca.${orgName}-cert.pem
   if [ ! -f $cacertsfname ]; then
      mv $cacerts/* $cacertsfname
   fi
   intcertsfname=$intcerts/ca.${orgName}-cert.pem
   if [ ! -f $intcertsfname ]; then
      if [ -d $intcerts ]; then
         mv $intcerts/* $intcertsfname
      fi
   fi
   signcertsfname=$signcerts/${userName}-cert.pem
   if [ ! -f $signcertsfname ]; then
      fname=`ls $signcerts 2> /dev/null`
      if [ "$fname" = "" ]; then
         mkdir -p $signcerts
         cp $cacertsfname $signcertsfname
      else
         mv $signcerts/* $signcertsfname
      fi
   fi
   # Copy the admin cert, which would need to be done out-of-band in the real world
   mkdir -p $admincerts
   if [ $# -gt 2 ]; then
      src=`ls $3/msp/signcerts/*`
      dst=$admincerts/Admin@${orgName}-cert.pem
   else
      src=`ls $signcerts/*`
      dst=$admincerts
   fi
   if [ ! -f $src ]; then
      fatal "admin certificate file not found at $src"
   fi
   cp $src $dst
}
# Get the CA certificates and place in MSP directory in <dir>
#    getcacerts <dir> <serverURL>
function getcacerts {
   mkdir -p $1
   export FABRIC_CA_CLIENT_HOME=$1
   $CLIENT getcacert -u $2 > $1/getcacert.out 2>&1
   if [ $? -ne 0 ]; then
      fatal "Failed to get CA certificates $1 with CA at $2; see $logFile"
   fi
   mkdir $1/msp/tlscacerts
   cp $1/msp/cacerts/* $1/msp/tlscacerts
   successPrint "Loaded CA certificates into $1 from CA at $2"
}
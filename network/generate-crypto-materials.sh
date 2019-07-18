#!/bin/bash +x
###############################################################################
# Usar este script como sustitución de cryptogen
# en entornos de producción
##############################################################################


function main {

  echo
  echo "#################################################################"
  echo "#######    Generating crypto material using Fabric CA  ##########"
  echo "#################################################################"
  echo
  echo "Checking executables ..."
  mydir=`pwd`
  checkExecutables
  cd $mydir
  checkRootCA
  cd $mydir
  if [ -d $CDIR ]; then
    echo "Cleaning up CAs ..."
    stopAllCAs
    # rm -rf $CDIR
  fi
  echo "Setting up organizations ..."
  setupOrgs
  # echo "Finishing ..."
  # stopAllCAs
  # echo "Complete"
}

# Check and build executables as needed
function checkExecutables {
   if [ ! -d $FCAHOME ]; then
      fatal "Directory does not exist: $FCAHOME"
   fi

   if [ ! -x $SERVER ]; then
      cd $FCAHOME
      make fabric-ca-server
      if [ $? -ne 0 ]; then
         fatal "Failed to build $SERVER"
      fi
   fi

   if [ ! -x $CLIENT ]; then
      cd $FCAHOME
      make fabric-ca-client
      if [ $? -ne 0 ]; then
         fatal "Failed to build $CLIENT"
      fi
   fi
}

# Stop all CA servers
function stopAllCAs {
   for pidFile in `find $CDIR -name server.pid`
   do
      if [ ! -f $pidFile ]; then
         fatal "\"$pidFile\" is not a file"
      fi
      pid=`cat $pidFile`
      dir=$(dirname $pidFile)
      echo "Stopping CA server in $dir with PID $pid ..."
      if ps -p $pid > /dev/null
      then
         kill -9 $pid
         wait $pid 2>/dev/null
         rm -f $pidFile
         echo "Stopped CA server in $dir with PID $pid"
      fi
   done
}

# Setup orderer and peer organizations
function setupOrgs {
   for ORG in $ORGS
   do
      setupOrg $ORG
   done
}

# Start an organization's root and intermediate CA servers
#   setupOrg <orgName>:<numPeers>:<numOrderers>:<rootCAPort>:rootCAUser:rootCAPass:<intermediateCAPort>
function setupOrg {


   IFSBU=$IFS
   IFS=: args=($1)
   if [ ${#args[@]} -ne 7 ]; then
      fatal "setupOrg: bad org spec: $1"
   fi

   orgName=${args[0]}

   orgDir=$CDIR/$orgName

   if [ -d $orgDir -a "$RECREATE" = false ]; then
      echo "$orgName already exists, skipping"
      return 0
   fi

   if [ -d $orgDir -a "$RECREATE" = true ]; then
     echo "Removing ${orgName} certificates and recreating"
     rm -rf $orgDir
   fi

   numPeers=${args[1]}
   numOrderers=${args[2]}

   echo "Org ${orgName} has ${numPeers} peer nodes and ${numOrderers} orderer nodes"
   orgDir=${CDIR}/${orgName}
   rootCAPort=${args[3]}
   rootCAUser=${args[4]}
   rootCAPass=${args[5]}
   intermediateCAPort=${args[6]}
   usersDir=$orgDir/users

   IFS=$IFSBU

   # # Start the root CA server
   # startCA $orgDir/ca/root $rootCAPort $orgName
   # # Enroll an admin user with the root CA

   # adminHome=$usersDir/rootAdmin
   # enroll $adminHome http://admin:adminpw@localhost:$rootCAPort $orgName

   # Start the intermediate CA server
   # startCA $orgDir/ca/intermediate $intermediateCAPort $orgName http://admin:adminpw@localhost:$rootCAPort

   startCA $orgDir/ca/intermediate $intermediateCAPort $orgName https://${rootCAUser}:${rootCAPass}@ca-root.geodb.com:$rootCAPort

   # Enroll an admin user with the intermediate CA
   adminHome=$usersDir/intermediateAdmin
   intermediateCAURL=https://admin:adminpw@localhost:$intermediateCAPort
   intermediateCATlsCert=$(realpath $orgDir/ca/intermediate/tls-cert.pem)
   enroll $adminHome $intermediateCAURL $orgName $intermediateCATlsCert


   # Register and enroll admin with the intermediate CA
   adminUserHome=$usersDir/Admin@${orgName}
   registerAndEnroll $adminHome $adminUserHome $intermediateCAPort $orgName $intermediateCATlsCert nodeAdmin
   # Register and enroll user1 with the intermediate CA
   user1UserHome=$usersDir/User1@${orgName}
   registerAndEnroll $adminHome $user1UserHome $intermediateCAPort $orgName $intermediateCATlsCert
   # Create peer nodes
   peerCount=0
   while [ $peerCount -lt $numPeers ]; do

      nodeDir=$orgDir/peers/peer${peerCount}.${orgName}

      mkdir -p $nodeDir
      # Get TLS crypto for this node
      tlsEnroll $nodeDir $intermediateCAPort $orgName $intermediateCATlsCert
      # Register and enroll this node's identity
      registerAndEnroll $adminHome $nodeDir $intermediateCAPort $orgName $intermediateCATlsCert
      normalizeMSP $nodeDir $orgName $adminUserHome
      peerCount=$(expr $peerCount + 1)
   done

   # Create orderer nodes
   ordererCount=0
   while [ $ordererCount -lt $numOrderers ]; do

      nodeDir=$orgDir/orderers/orderer${ordererCount}.${orgName}

      mkdir -p $nodeDir
      # Get TLS crypto for this node
      tlsEnroll $nodeDir $intermediateCAPort $orgName $intermediateCATlsCert
      # Register and enroll this node's identity
      registerAndEnroll $adminHome $nodeDir $intermediateCAPort $orgName $intermediateCATlsCert
      normalizeMSP $nodeDir $orgName $adminUserHome
      ordererCount=$(expr $ordererCount + 1)
   done


   # # Get CA certs from intermediate CA
   getcacerts $orgDir $intermediateCAURL $intermediateCATlsCert
   # Rename MSP files to names expected by end-to-end
   normalizeMSP $orgDir $orgName $adminUserHome
   normalizeMSP $adminHome $orgName
   normalizeMSP $adminUserHome $orgName
   normalizeMSP $user1UserHome $orgName
}

# Start a root CA server:
#    startCA <homeDirectory> <listeningPort> <orgName>
# Start an intermediate CA server:
#    startCA <homeDirectory> <listeningPort> <orgName> <parentURL>
function startCA {
   homeDir=$1; shift
   port=$1; shift
   orgName=$1; shift
   parentCAurl=$1; shift

   mkdir -p $homeDir
   export FABRIC_CA_SERVER_HOME=$homeDir

   $SERVER start -d -p $port -b admin:adminpw -u $parentCAurl --tls.enabled --intermediate.tls.certfiles $TLSROOTCERT > $homeDir/server.log 2>&1&

   echo $! > $homeDir/server.pid
   if [ $? -ne 0 ]; then
      fatal "Failed to start server in $homeDir"
   fi
   echo "Starting CA server in $homeDir on port $port ..."
   sleep 1
   checkCA $homeDir $port
   # Get the TLS crypto for this CA
   tlsEnroll $homeDir $port $orgName
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
      echo "CA server is started in $1 and listening on port $2"
   else
      fatal "CA server is not running at $1; see logs at $1/server.log"
   fi
}

# Enroll to get TLS crypto material
#    tlsEnroll <homeDir> <serverPort> <orgName>
function tlsEnroll {
   homeDir=$1; shift
   port=$1; shift
   orgName=$1; shift
   tlsCert=$1; shift;

   host=$(basename $homeDir),$(basename $homeDir | cut -d'.' -f1)
   tlsDir=$homeDir/tls

   if [ "$tlsCert" = "" ]; then
     tlsCert=$(realpath $homeDir/tls-cert.pem)
   fi

   srcMSP=$tlsDir/msp
   dstMSP=$homeDir/msp
   enroll $tlsDir https://admin:adminpw@localhost:$port $orgName $tlsCert --csr.hosts $host --enrollment.profile tls
   cp $srcMSP/signcerts/* $tlsDir/server.crt
   cp $srcMSP/keystore/* $tlsDir/server.key
   mkdir -p $dstMSP/keystore

   cp $srcMSP/keystore/* $dstMSP/keystore
   mkdir -p $dstMSP/cacerts
   cp $srcMSP/cacerts/* $dstMSP/cacerts/tlsca.${orgName}-cert.pem
   if [ -d $srcMSP/intermediatecerts ]; then
      cp $srcMSP/intermediatecerts/* $tlsDir/ca.crt
      mkdir -p $dstMSP/intermediatecerts
      cp $srcMSP/intermediatecerts/* $dstMSP/intermediatecerts
   else
      cp $srcMSP/cacerts/* $tlsDir/ca.crt
   fi
   rm -rf $srcMSP $homeDir/enroll.log $homeDir/fabric-ca-client-config.yaml
}

# Register and enroll a new user
#    registerAndEnroll <registrarHomeDir> <registreeHomeDir> <caPort> <orgName> <tlsCert> [<userName>]
function registerAndEnroll {

  registrarHomeDir=$1; shift
  registreeHomeDir=$1; shift
  caPort=$1; shift
  orgName=$1; shift
  tlsCert=$1; shift
  userName=$1; shift

  if [ "$userName" = "" ]; then
    userName=$(basename $registreeHomeDir)
  fi

  register $userName "secret" $registrarHomeDir $tlsCert
  enroll $registreeHomeDir https://${userName}:secret@localhost:$caPort $orgName $tlsCert
}

# Enroll an identity
#    enroll <homeDir> <serverURL> <orgName> <tlsCert> [<args>]
function enroll {
   homeDir=$1; shift
   url=$1; shift
   orgName=$1; shift
   tlsCert=$1; shift
   mkdir -p $homeDir
   export FABRIC_CA_CLIENT_HOME=$homeDir
   logFile=$homeDir/enroll.log

   # Get an enrollment certificate
   $CLIENT enroll -d -u $url --tls.certfiles $tlsCert > $logFile 2>&1

   if [ $? -ne 0 ]; then
      fatal "Failed to enroll $homeDir with CA at $url; see $logFile"
   fi
   # Get a TLS certificate
   echo "Enrolled $homeDir with CA at $url"
}

# Register a new user
#    register <user> <password> <registrarHomeDir> <tlsCert>
function register {

  userName=$1; shift
  password=$1; shift
  homeDir=$1; shift
  tlsCert=$1; shift

  export FABRIC_CA_CLIENT_HOME=$homeDir
  mkdir -p $homeDir
  logFile=$homeDir/register.log

  $CLIENT register --id.name $userName --id.secret $password --tls.certfiles $tlsCert --id.type user --id.affiliation org1 -d > $logFile 2>&1
  if [ $? -ne 0 ]; then
    fatal "Failed to register $userName with CA as $homeDir; see $logFile"
  fi
  echo "Registered user $userName with intermediate CA as $homeDir"
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
   cacertsfname=$cacerts/tlsca.${orgName}-cert.pem
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
  dir=$1; shift
  caUrl=$1; shift
  tlsCert=$1; shift
  mkdir -p $dir
  export FABRIC_CA_CLIENT_HOME=$dir
  logFile=$dir/getcacert.out
  $CLIENT getcacert -u $caUrl --tls.certfiles $tlsCert > $logFile 2>&1
  if [ $? -ne 0 ]; then
    fatal "Failed to get CA certificates $dir with CA at $caUrl; see $logFile"
  fi
  mkdir $dir/msp/tlscacerts
  cp $dir/msp/cacerts/* $dir/msp/tlscacerts
  echo "Loaded CA certificates into $dir from CA at $caUrl"
}

function checkRootCA {
  if [ ! "$(docker ps -q -f name=ca-root.geodb.com)" ]; then
    fatal "Root CA container is not running"
  else
    echo "Root CA is running"
  fi

}

function wipeout {
  echo
  echo "#################################################################"
  echo "#######                 Cleaning up                    ##########"
  echo "#################################################################"
  echo

  if [ -d $CDIR ]; then
    stopAllCAs
    rm -rf $CDIR
  fi

  exit 0
}

# Print a fatal error message and exit
function fatal {
   echo "FATAL: $*"
   exit 1
}


##############
# Constants  #
##############

# Path to fabric CA executables - Remember to configure it correctly for each fabric version
FCAHOME=$GOPATH/src/github.com/hyperledger/fabric-ca
CLIENT=$FCAHOME/bin/fabric-ca-client
SERVER=$FCAHOME/bin/fabric-ca-server
TLSROOTCERT=$(realpath "./CA/fabric-ca-server/tls-cert.pem")

# Crypto-config directory
CDIR="crypto-config"


##############
# Arg parser #
##############

POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    -o|--orgs)
    ORGS="$2"
    shift
    shift
    ;;
    -r|--recreate)
    RECREATE="$2"
    shift
    shift
    ;;
    -d|--delete)
    DELETE=true
    shift
    ;;
    *)
    POSITIONAL+=("$1")
    shift
    ;;
esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

if [ -z "$DELETE" ]; then
  DELETE=false
fi

if [ $DELETE == true ]; then
  wipeout
fi

# Organization info where each line is of the form:
#    <orgName>:<numPeers>:<numOrderers>:<rootCAPort>:rootCAUser:rootCAPass:<intermediateCAPort>
if [ -z "$ORGS" ]; then
  fatal "--ORGS not found"
fi

if [ -z "$RECREATE" ]; then
  # If true, recreate crypto if it already exists
  echo "Setting RECREATE=false"
  RECREATE=false
fi

# if [ -z "$INTERMEDIATE_CA" ]; then
#   # If true, uses both a root and intermediate CA
#   echo "Setting INTERMEDIATE_CA=true"
#   INTERMEDIATE_CA=true
# fi

echo "Running script with args:"
echo "ORGS: ${ORGS}"
echo "RECREATE: ${RECREATE}"

main

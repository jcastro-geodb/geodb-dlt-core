#!/bin/bash +x
###############################################################################
# Usar este script como sustitución de cryptogen
# en entornos de producción
##############################################################################


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
    *)
    POSITIONAL+=("$1")
    shift
    ;;
esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters

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

# Path to fabric CA executables - Remember to configure it correctly for each fabric version
FCAHOME=$GOPATH/src/github.com/hyperledger/fabric-ca
CLIENT=$FCAHOME/bin/fabric-ca-client
SERVER=$FCAHOME/bin/fabric-ca-server

# Crypto-config directory
CDIR="crypto-config"

function main {
   echo
   echo "#################################################################"
   echo "#######    Generating crypto material using Fabric CA  ##########"
   echo "#################################################################"
   echo
   echo "Checking executables ..."
   mydir=`pwd`
   checkExecutables
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
      debug "Stopping CA server in $dir with PID $pid ..."
      if ps -p $pid > /dev/null
      then
         kill -9 $pid
         wait $pid 2>/dev/null
         rm -f $pidFile
         debug "Stopped CA server in $dir with PID $pid"
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

   IFS=$IFSBU

   echo "===================================="

   # # Start the root CA server
   # startCA $orgDir/ca/root $rootCAPort $orgName
   # # Enroll an admin user with the root CA
   # usersDir=$orgDir/users
   # adminHome=$usersDir/rootAdmin
   # enroll $adminHome http://admin:adminpw@localhost:$rootCAPort $orgName

   # Start the intermediate CA server
   # startCA $orgDir/ca/intermediate $intermediateCAPort $orgName http://admin:adminpw@localhost:$rootCAPort

   echo $orgDir
   echo $intermediateCAPort
   echo $orgName
   echo $rootCAUser
   echo $rootCAPass
   echo $rootCAPort

   startCA $orgDir/ca/intermediate $intermediateCAPort $orgName http://${rootCAUser}:${rootCAPass}@localhost:$rootCAPort
   # Enroll an admin user with the intermediate CA
   adminHome=$usersDir/intermediateAdmin
   intermediateCAURL=http://admin:adminpw@localhost:$intermediateCAPort
   enroll $adminHome $intermediateCAURL $orgName


   # # Register and enroll admin with the intermediate CA
   # adminUserHome=$usersDir/Admin@${orgName}
   # registerAndEnroll $adminHome $adminUserHome $intermediateCAPort $orgName nodeAdmin
   # # Register and enroll user1 with the intermediate CA
   # user1UserHome=$usersDir/User1@${orgName}
   # registerAndEnroll $adminHome $user1UserHome $intermediateCAPort $orgName
   #
   # # Create peer nodes
   # peerCount=0
   # while [ $peerCount -lt $numPeers ]; do
   #
   #    nodeDir=$orgDir/peers/peer${peerCount}.${orgName}
   #
   #    mkdir -p $nodeDir
   #    # Get TLS crypto for this node
   #    tlsEnroll $nodeDir $rootCAPort $orgName
   #    # Register and enroll this node's identity
   #    registerAndEnroll $adminHome $nodeDir $intermediateCAPort $orgName
   #    normalizeMSP $nodeDir $orgName $adminUserHome
   #    peerCount=$(expr $peerCount + 1)
   # done
   #
   # # Create orderer nodes
   # ordererCount=0
   # while [ $ordererCount -lt $numOrderers ]; do
   #
   #    nodeDir=$orgDir/orderers/orderer${ordererCount}.${orgName}
   #
   #    mkdir -p $nodeDir
   #    # Get TLS crypto for this node
   #    tlsEnroll $nodeDir $rootCAPort $orgName
   #    # Register and enroll this node's identity
   #    registerAndEnroll $adminHome $nodeDir $intermediateCAPort $orgName
   #    normalizeMSP $nodeDir $orgName $adminUserHome
   #    ordererCount=$(expr $ordererCount + 1)
   # done
   #
   # # Get CA certs from intermediate CA
   # getcacerts $orgDir $intermediateCAURL
   # # Rename MSP files to names expected by end-to-end
   # normalizeMSP $orgDir $orgName $adminUserHome
   # normalizeMSP $adminHome $orgName
   # normalizeMSP $adminUserHome $orgName
   # normalizeMSP $user1UserHome $orgName
}

# Start a root CA server:
#    startCA <homeDirectory> <listeningPort> <orgName>
# Start an intermediate CA server:
#    startCA <homeDirectory> <listeningPort> <orgName> <parentURL>
function startCA {
   homeDir=$1; shift
   port=$1; shift
   orgName=$1; shift
   mkdir -p $homeDir
   export FABRIC_CA_SERVER_HOME=$homeDir

   $SERVER start -p $port -b admin:adminpw -u $1 $DEBUG > $homeDir/server.log 2>&1&

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

# Enroll to get TLS crypto material
#    tlsEnroll <homeDir> <serverPort> <orgName>
function tlsEnroll {
   homeDir=$1
   port=$2
   orgName=$3
   host=$(basename $homeDir),$(basename $homeDir | cut -d'.' -f1)
   tlsDir=$homeDir/tls
   srcMSP=$tlsDir/msp
   dstMSP=$homeDir/msp
   enroll $tlsDir http://admin:adminpw@localhost:$port $orgName --csr.hosts $host --enrollment.profile tls
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
   rm -rf $srcMSP $homeDir/enroll.log $homeDir/fabric-ca-client-config.yaml
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
      debug "CA server is started in $1 and listening on port $2"
   else
      fatal "CA server is not running at $1; see logs at $1/server.log"
   fi
}

function checkRootCA {
  cd ./CA
  ./startRootCA.sh
}

# Print a fatal error message and exit
function fatal {
   echo "FATAL: $*"
   exit 1
}

main

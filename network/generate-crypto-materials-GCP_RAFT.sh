#!/bin/bash +x
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

source ./env-vars
. ./$ORGSTYPE/utils/utils.sh

# If true, uses both a root and intermediate CA
INTERMEDIATE_CA=false

# If true, recreate crypto if it already exists
RECREATE=true

# Path to fabric CA executables
FCAHOME=$GOPATH/src/github.com/hyperledger/fabric-ca
SERVER=$FCAHOME/bin/fabric-ca-server
CLIENT=$FCAHOME/bin/fabric-ca-client

# Crypto-config directory
CDIR="crypto-config"

# More verbose logging for fabric-ca-server & fabric-ca-client
DEBUG=-d

# Main fabric CA crypto config function
function main {
   if [ -d $CDIR -a "$RECREATE" = false ]; then
      infoStage 'Crypto Material Already exists'
      exit 0
   fi
   infoStage 'Generating crypto material using Fabric CA '
   infoPrint "Checking executables ..."
   mydir=`pwd`
   checkExecutables
   cd $mydir
   infoPrint "Setting up organizations ..."
   setupOrgs
   infoPrint "Finishing ..."
   #stopAllCAs
   successPrint "Complete"
}

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

if [ -z "$ORGS" ]; then
  fatal "--ORGS not found"
fi

main
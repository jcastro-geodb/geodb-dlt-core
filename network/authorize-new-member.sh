#!/bin/bash +x
#
# This script takes a update-delta and:
# 1) Tries to update the channel using peer channel update. This will work if there is majority of txs
#     authorizing the update operation. If this operation fails then:
# 2) Sends a signconfigtx to add one vote to the operation, so that someone later will reach the majority and
#     will find himself in situation 1).
#
# The script has special exit status codifications:
# 0 - success with situation 1
# 10 - success with situation 2
# other - failure

# Print a fatal error message and exit
function fatal {
   echo "FATAL: $*"
   exit 1
}

##############
# Arg parser #
##############

POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    -c|--cli)
    CLI="$2"
    shift
    shift
    ;;
    -u|--ordererUrl)
    ORDERER_URL="$2"
    shift
    shift
    ;;
    -C|--channel)
    CHANNEL_ID="$2"
    shift
    shift
    ;;
    -d|--delta)
    DELTA_FILE_NAME="$2"
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

if [ -z "$CLI" ]; then
  fatal "No CLI container was specified"
fi

if [ -z "$CHANNEL_ID" ]; then
  fatal "No CLI container was specified"
fi

if [ -z "$ORDERER_URL" ]; then
  fatal "No orderer URL was specified"
fi

if [ -z "$DELTA_FILE_NAME" ]; then
  fatal "No delta file was specified"
fi

if [ ! "$(docker ps -q -f name=$CLI)" ]; then
  fatal "The specified CLI was not found. Is your local peer node running?"
fi

# Try to commit the config update. This is only possible if there is majority of admins approving it
docker exec -i $CLI bash -c "peer channel update -f ./channels/$DELTA_FILE_NAME -o $ORDERER_URL -c $CHANNEL_ID"
if [ $? -ne 0 ]; then # If there are not enough approvals, then just sign it and wait for others to commit it
  echo "Could not commit the transaction. More approvals might be needed"
  docker exec -i $CLI bash -c "peer channel signconfigtx -f ./channels/$DELTA_FILE_NAME"
  if [ $? -eq 0 ]; then
    echo "signconfigtx was successful, returning code 10"
    exit 10
  else
    fatal "Could not approve the configuration. Check the logs"
  fi
fi

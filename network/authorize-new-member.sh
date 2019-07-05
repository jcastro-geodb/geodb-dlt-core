#!/bin/bash +x

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
    -o|--ordererUrl)
    ORDERER_URL="$2"
    shift
    shift
    ;;
    -c|--channel)
    CHANNEL_NAME_LOCAL="$2"
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

if [ -z "$ORDERER_URL" ]; then
  fatal "No orderer URL was specified"
fi

if [ -z "$CHANNEL_NAME_LOCAL" ]; then
  fatal "No channel was specified"
fi

if [ ! "$(docker ps -q -f name=$CLI)" ]; then
  fatal "The specified CLI was not found. Is your local peer node running?"
fi

configtxlator start &
export CONFIGTXLATOR_URL=http://127.0.0.1:7059
export CHANNEL_NAME=$CHANNEL_NAME_LOCAL


docker exec -it $CLI bash -c "peer channel fetch config ./channels/config_block.pb -o $ORDERER_URL -c ${CHANNEL_NAME}; chmod 755 ./channels/config_block.pb"

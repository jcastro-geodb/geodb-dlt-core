#!/bin/bash +x

function startConfigtxlator {

  if lsof -Pi :7059 -sTCP:LISTEN -t >/dev/null ; then
      fatal "Could not reserve port for configtxlator: TCP 7059 is in use"
  else
      configtxlator start &
  fi

  sleep 1s

  if lsof -Pi :7059 -sTCP:LISTEN -t >/dev/null ; then
      echo "configtxlator is now running on port TCP 7059"
  else
      fatal "Could not detect configtxlator on port TCP 7059"
  fi
}

function stopConfigtxlator {
  if lsof -Pi :7059 -sTCP:LISTEN -t >/dev/null ; then
      echo "Stopping configtxlator"
      fuser -k 7059/tcp
  fi
}

# Print a fatal error message and exit
function fatal {
   echo "FATAL: $*"
   stopConfigtxlator
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
    CHANNEL_ID_LOCAL="$2"
    shift
    shift
    ;;
    -o|--orgConfig)
    ORG_CONFIG_PATH="$2"
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

if [ -z "$CHANNEL_ID_LOCAL" ]; then
  fatal "No channel was specified"
fi

if [ -z "$ORG_CONFIG_PATH" ]; then
  fatal "No channel was specified"
fi

if [ ! "$(docker ps -q -f name=$CLI)" ]; then
  fatal "The specified CLI was not found. Is your local peer node running?"
fi

startConfigtxlator
export CONFIGTXLATOR_URL=http://127.0.0.1:7059
export CHANNEL_ID=$CHANNEL_ID_LOCAL


docker exec -it $CLI bash -c "peer channel fetch config ./channels/config_block.pb -o $ORDERER_URL -c ${CHANNEL_ID}; chmod 755 ./channels/config_block.pb"

curl -X POST --data-binary @channels/config_block.pb "$CONFIGTXLATOR_URL/protolator/decode/common.Block" | jq . > ./channels/config_block.json
jq .data.data[0].payload.data.config ./org3-files/artifacts/channel-update-files/config_block-pre-update.json > ./org3-files/artifacts/channel-update-files/config_block-pre-update-processed.json

stopConfigtxlator

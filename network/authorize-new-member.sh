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
      lsof -n -i :7059 | grep LISTEN | awk '{ print $2 }' | xargs kill
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
    ORG_CONFIG_FILE="$2"
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

if [ -z "$ORG_CONFIG_FILE" ]; then
  fatal "No org config json was specified"
fi

if [ ! "$(docker ps -q -f name=$CLI)" ]; then
  fatal "The specified CLI was not found. Is your local peer node running?"
fi

ORG_NAME=$(jq .values.MSP.value.config.name $ORG_CONFIG_FILE -r)
CONFIGTXLATOR_ARTIFACTS_DIR=./configtxlator-artifacts/$ORG_NAME

if [ ! -d $CONFIGTXLATOR_ARTIFACTS_DIR ]; then
  mkdir -p $CONFIGTXLATOR_ARTIFACTS_DIR
fi

startConfigtxlator
export CONFIGTXLATOR_URL=http://127.0.0.1:7059
export CHANNEL_ID=$CHANNEL_ID_LOCAL

docker exec -it $CLI bash -c "peer channel fetch config ./channels/config_block.pb -o $ORDERER_URL -c ${CHANNEL_ID}; chmod 755 ./channels/config_block.pb"

curl -X POST --data-binary @channels/config_block.pb "$CONFIGTXLATOR_URL/protolator/decode/common.Block" | jq . > $CONFIGTXLATOR_ARTIFACTS_DIR/config_block-pre-update.json
jq .data.data[0].payload.data.config $CONFIGTXLATOR_ARTIFACTS_DIR/config_block-pre-update.json > $CONFIGTXLATOR_ARTIFACTS_DIR/config_block-pre-update-processed.json
jq -s ".[0] * {\"channel_group\":{\"groups\":{\"Application\":{\"groups\":{\"$ORG_NAME\":.[1]}}}}}" $CONFIGTXLATOR_ARTIFACTS_DIR/config_block-pre-update-processed.json $ORG_CONFIG_FILE >& $CONFIGTXLATOR_ARTIFACTS_DIR/config_block-appended.json
curl -X POST --data-binary @$CONFIGTXLATOR_ARTIFACTS_DIR/config_block-appended.json "$CONFIGTXLATOR_URL/protolator/encode/common.Config" > $CONFIGTXLATOR_ARTIFACTS_DIR/config_block-appended.pb
curl -X POST --data-binary @$CONFIGTXLATOR_ARTIFACTS_DIR/config_block-pre-update-processed.json "$CONFIGTXLATOR_URL/protolator/encode/common.Config" > $CONFIGTXLATOR_ARTIFACTS_DIR/config_block-pre-update-processed.pb

curl -X POST -F channel=$CHANNEL_ID -F "original=@$CONFIGTXLATOR_ARTIFACTS_DIR/config_block-pre-update-processed.pb" -F "updated=@$CONFIGTXLATOR_ARTIFACTS_DIR/config_block-appended.pb" "$CONFIGTXLATOR_URL/configtxlator/compute/update-from-configs" > $CONFIGTXLATOR_ARTIFACTS_DIR/config_block-delta.pb
curl -X POST --data-binary @$CONFIGTXLATOR_ARTIFACTS_DIR/config_block-delta.pb "$CONFIGTXLATOR_URL/protolator/decode/common.ConfigUpdate" | jq . > $CONFIGTXLATOR_ARTIFACTS_DIR/config_block-delta.json

echo "{\"payload\": {\"header\":{\"channel_header\":{\"channel_id\":\"$CHANNEL_ID\", \"type\":2}}, \"data\":{\"config_update\": $(cat $CONFIGTXLATOR_ARTIFACTS_DIR/config_block-delta.json)}}}" | jq . > $CONFIGTXLATOR_ARTIFACTS_DIR/config_block-delta-wrapped.json
curl -X POST --data-binary @$CONFIGTXLATOR_ARTIFACTS_DIR/config_block-delta-wrapped.json "$CONFIGTXLATOR_URL/protolator/encode/common.Envelope" > $CONFIGTXLATOR_ARTIFACTS_DIR/config_block-delta-wrapped.pb
cp $CONFIGTXLATOR_ARTIFACTS_DIR/config_block-delta-wrapped.pb ./channels/config_block-delta-wrapped.pb

stopConfigtxlator

docker exec -it $CLI bash -c "peer channel signconfigtx -f ./channels/config_block-delta-wrapped.pb"
docker exec -it $CLI bash -c "peer channel update -f ./channels/config_block-delta-wrapped.pb -c $CHANNEL_ID -o $ORDERER_URL"

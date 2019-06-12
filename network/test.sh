# !/bin/bash

ORGS=$1

if [ -z "$ORGS" ]; then
  ORGS="\
     geodb.com:1:1:7100:7101 \
  "
fi

echo $ORGS

echo "OK!"
exit 0

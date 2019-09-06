#! /bin/bash

echo
echo "========================================================="
echo "Waiting for complete system setting up"
echo "========================================================="
echo

sleep 60s

timedatectl set-timezone Europe/Madrid

sleep 1s

mkdir /srv/fabricCA-server && cd $_

mkdir ./logs

sleep 1s

echo
echo "========================================================="
echo "Setting up CA server"
echo "========================================================="
echo

nohup /opt/go-lib/bin/fabric-ca-server start -p 7500 -b geodb:password --tls.enabled --csr.hosts ca-root.geodb.com > ./logs/output.out 2> ./logs/output.err < /dev/null &
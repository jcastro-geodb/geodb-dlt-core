#!/bin/bash

installLibtool(){

  echo
  echo "========================================================="
  echo "Now installing libtool"
  echo "========================================================="
  echo

  sleep 1s

  apt-get install libtool libltdl-dev -y
}

if [ `id -u` != "0" ]; then
  echo "Please, run as root"
  exit 1
fi


apt-get update
programs=(curl make make-guile docker docker-compose jq)

for program in "${programs[@]}"; do
    if ! command -v "$program" > /dev/null 2>&1; then

        echo
        echo "========================================================="
        echo "Now installing $program"
        echo "========================================================="
        echo
        apt-get install "$program" -y
        sleep 1s
    fi
done

installLibtool

echo
echo "========================================================="
echo "It is required to reboot before continuing the setup"
echo "========================================================="
echo

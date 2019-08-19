#!/bin/bash

check_returnCode() {
        if [ $1 -eq 0 ]; then
                echo -e "INFO:.... Proccess Succeed"
        else
                >&2 echo -e "ERROR.... Proccess ERROR: $1"
                echo -e "INFO:Please check errors and retry..."
                exit $1
        fi
}

installDependencies() {
  apt-get update
  programs=(curl make docker docker-compose jq)

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
}

installMakeGuile() {
  echo
  echo "========================================================="
  echo "Now installing make-guile"
  echo "========================================================="
  echo

  apt-get install make-guile -y

  sleep 1s
}

installLibtool(){

  echo
  echo "========================================================="
  echo "Now installing libtool"
  echo "========================================================="
  echo

  sleep 1s

  apt-get install libtool libltdl-dev -y
}

checkEnvironment(){

  echo
  echo "========================================================="
  echo "Checking and setting ENV"
  echo "========================================================="
  echo

  sleep 1s

  while IFS="" read -r checkVar || [ -n "$p" ]
  do
    if grep -Fxq "$checkVar" /etc/bash.bashrc
    then
        echo "$checkVar IS SET"
    else
        echo $checkVar >> /etc/bash.bashrc
    fi
  done < fabric-environment.sh

  # cp ./fabric-environment.sh /etc/profile.d/fabric-environment.sh
}

addUserToDockerGroup() {

  echo
  echo "========================================================="
  echo "Adding user to docker group"
  echo "========================================================="
  echo

  usermod -a -G docker $(logname)
}

if [ `id -u` != "0" ]; then
  echo "Please, run as root"
  exit 1
fi

installDependencies
check_returnCode $?

installMakeGuile
check_returnCode $?

installLibtool
check_returnCode $?

checkEnvironment
check_returnCode $?

addUserToDockerGroup
check_returnCode $?

echo
echo "========================================================="
echo "It is required to reboot before continuing the setup"
echo "========================================================="
echo

#!/bin/bash

###############################################
#        HELPERS                              #
###############################################

# Interrupts the script and exits if the argument passed is not equal to 0
checkError() {
  if [ $1 -eq 0 ]; then
          echo -e "INFO:.... Proccess Succeed"
  else
          >&2 echo -e "ERROR.... Proccess ERROR: $1"
          echo -e "INFO:Please check errors and retry..."
          exit $1
  fi
}

# Fixes a a bug breaking logname in some Ubuntu versions. Makes the script work in MacOS:
# https://askubuntu.com/questions/424237/who-w-logname-broken-in-multiple-terminals
logname() {
  /usr/bin/logname 2>/dev/null || echo ${SUDO_USER:-${USER}}
}

# Checks dependencies and installs them
checkAndInstallDependencies() {
  apt-get update
  programs=(git curl make docker docker-compose jq go-dep)

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

  # The dependencies below cannot be checked in a normal way, so they are separated from the ones above
  echo
  echo "========================================================="
  echo "Now installing make-guile"
  echo "========================================================="
  echo

  apt-get install make-guile -y

  sleep 1s

  echo
  echo "========================================================="
  echo "Now installing libtool"
  echo "========================================================="
  echo

  sleep 1s

  apt-get install libtool libltdl-dev -y
}

# Checks every line of fabric-environment.sh and adds it to /etc/bash.bashrc to persist them
insertEnvironmentVariableIfNotExists() {
  variable=$1
  if grep -Fxq "$variable" /etc/bash.bashrc
  then
      echo "$variable IS SET"
  else
      echo $variable >> /etc/bash.bashrc
  fi
}

# Downloads the fabric-environment.sh script, which contains the necessary env vars for Fabric, and inserts them if
# needed with insertEnvironmentVariableIfNotExists()
setupEnvironment() {
  echo
  echo "========================================================="
  echo "Checking and setting ENV"
  echo "========================================================="
  echo

  sleep 1s

  FABRIC_ENV_TMP=/tmp/fabric-environment.sh
  wget -q https://raw.githubusercontent.com/devgeodb/geodb-dlt-core/master/setup/fabric-environment.sh -O $FABRIC_ENV_TMP

  while IFS="" read -r checkVar || [ -n "$p" ]
  do
    echo "echoing $checkVar"
    insertEnvironmentVariableIfNotExists "$checkVar"
  done < $FABRIC_ENV_TMP
}

addCaRootToHosts() {
  echo
  echo "========================================================="
  echo "Checking and setting ENV"
  echo "========================================================="
  echo

  ETC_HOSTS=/etc/hosts
  HOSTNAME="ca-root.geodb.com"
  IP="127.0.0.1"

  if [ -n "$(grep $HOSTNAME /etc/hosts)" ]
  then
      echo "$HOSTNAME Found in your $ETC_HOSTS, Removing now...";
      sudo sed -i".bak" "/$HOSTNAME/d" $ETC_HOSTS
  else
      echo "$HOSTNAME was not found in your $ETC_HOSTS";
  fi

  HOSTS_LINE="$IP\t$HOSTNAME"
  if [ -n "$(grep $HOSTNAME /etc/hosts)" ]
      then
          echo "$HOSTNAME already exists : $(grep $HOSTNAME $ETC_HOSTS)"
      else
          echo "Adding $HOSTNAME to your $ETC_HOSTS";
          sudo -- sh -c -e "echo '$HOSTS_LINE' >> /etc/hosts";

          if [ -n "$(grep $HOSTNAME /etc/hosts)" ]
              then
                  echo "$HOSTNAME was added succesfully \n $(grep $HOSTNAME /etc/hosts)";
              else
                  echo "Failed to Add $HOSTNAME, Try again!";
          fi
  fi

}

# Adds the user to docker group to allow the instantiation of docker containers
addUserToDockerGroup() {

  echo
  echo "========================================================="
  echo "Adding user to docker group"
  echo "========================================================="
  echo

  usermod -a -G docker $(logname)
}

# Checks go installation: if it does not exist, it installs it
checkGo() {
  command -v go >/dev/null 2>&1 || { installGo; }
}

# Installs Go
installGo() {
  echo
  echo "========================================================="
  echo "Now installing go"
  echo "========================================================="
  echo

  sleep 1s

  # Makes sure that the default directory for Go is available
  if [ -d "/opt/go" ]; then
    echo "Removing /opt/go"
    rm -rf /opt/go
  fi

  # Downloads and installs it.
  wget https://dl.google.com/go/go1.12.5.linux-amd64.tar.gz -O /tmp/golang.tar.gz
  tar -xvf /tmp/golang.tar.gz --directory /opt

  chown -R $(logname) /opt/go

}

installFabric() {

  echo
  echo "========================================================="
  echo "Now installing Hyperledger Fabric"
  echo "========================================================="
  echo

  sleep 1s

  if [ ! -d "/opt/hyperledger" ]; then
    echo "Creating /opt/hyperledger"
    mkdir /opt/hyperledger
  fi

  pushd /opt/hyperledger

  if [ -d "fabric-samples-1.4.1" ]; then
    echo "Removing fabric-samples-1.4.1"
    rm -rf fabric-samples-1.4.1
  fi

  curl -sSL http://bit.ly/2ysbOFE | bash -s -- 1.4.1 1.4.1 0.4.15

  mv fabric-samples fabric-samples-1.4.1

  popd

  if [ ! -d "/opt/go-lib" ]; then
    echo "Creating /opt/go-lib"
    mkdir /opt/go-lib
  fi

  echo
  echo "========================================================="
  echo "Setting up FABRIC-CA"
  echo "========================================================="
  echo

  GOPATH=/opt/go-lib /opt/go/bin/go get -u github.com/hyperledger/fabric-ca/cmd/...
  /opt/go/bin/go clean -cache

  chown -R $(logname) /opt/go-lib
  GOCACHE=`echo "$(/opt/go/bin/go env GOCACHE)"`
  rm -rf $GOCACHE
}

installGeodb() {

  echo
  echo "========================================================="
  echo "Now installing GeoDB bootstrap scripts"
  echo "========================================================="
  echo

  sleep 1s

  USER_HOME=$(getent passwd $(logname) | cut -d: -f6)

  read -p "Path to clone GeoDB core [$USER_HOME/geodb]: " GDBROOT
  GDBROOT=${GDBROOT:-$USER_HOME/geodb}


  if [ -d "$GDBROOT" ]; then
    echo "Removing $GDBROOT"
    rm -rf $GDBROOT
  fi

  git clone https://github.com/devgeodb/geodb-dlt-core.git $GDBROOT
  chown -R $(logname) $GDBROOT
  echo "export GDBROOT=$GDBROOT" >> /etc/bash.bashrc
}

if [ `id -u` != "0" ]; then
  echo "Please, run as root"
  exit 1
fi


checkAndInstallDependencies
checkError $?

setupEnvironment
checkError $?

addCaRootToHosts
checkError $?

addUserToDockerGroup
checkError $?

checkGo
checkError $?

installFabric
checkError $?

installGeodb
checkError $?

echo
echo "========================================================="
echo "Setup was successful. Please reboot to update enviroment variables"
echo "========================================================="
echo

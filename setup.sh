# !/bin/bash

checkCURL(){
  command -v curl >/dev/null 2>&1 || { installCURL; }
}

installCURL(){
  echo
  echo "========================================================="
  echo "Now installing CURL"
  echo "========================================================="
  echo
  apt-get install curl -y
}

checkDocker(){
  command -v docker >/dev/null 2>&1 || { installDocker; }
}

installDocker(){
  echo
  echo "========================================================="
  echo "Now installing docker"
  echo "========================================================="
  echo
  apt-get install docker.io -y
}

checkDockerCompose(){
  command -v docker-compose >/dev/null 2>&1 || { installDockerCompose; }
}

installDockerCompose(){
  echo
  echo "========================================================="
  echo "Now installing docker-compose"
  echo "========================================================="
  echo
  apt-get install docker-compose -y
}

checkGo(){
  command -v go >/dev/null 2>&1 || { installGo; }
}

installGo(){
  echo
  echo "========================================================="
  echo "Now installing go"
  echo "========================================================="
  echo

  pwd

  ls $HOME
  # wget https://dl.google.com/go/go1.12.5.linux-amd64.tar.gz -O golang.tar.gz
  # tar -xvf golang.tar.gz
  #
  # if [ -d "$HOME/go" ]; then
  #   echo "Removing $HOME/go"
  #   rm -rf $HOME/go
  # fi
  #
  # mv go $HOME




  # export GOROOT=$HOME/go
  # export GOPATH=$HOME/go-lib
  # export BINARIESFABRICVERSION=1.2.0
  # export FABRICSAMPLEBINARIES=$HOME/hyperledger/fabric-samples-$BINARIESFABRICVERSION/bin
  # #export FABRICSAMPLEBINARIES=$HOME/personal/b9lab/hyperledger-fabric/lesson3-first/fabric-samples/bin
  # PATH=$PATH:$GOROOT/bin
  # PATH=$PATH:$GOPATH/bin
  # PATH=$PATH:$FABRICSAMPLEBINARIES
}


if [ `id -u` != "0" ]; then
  echo "Please run as root"
  exit 1
fi

checkCURL
# checkDocker
# checkDockerCompose
# curl -sSL http://bit.ly/2ysbOFE | bash -s -- 1.4.1 1.4.1 0.4.15

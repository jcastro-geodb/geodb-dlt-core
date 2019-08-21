# GeoDB network bootstrap from GCP

## TODOs

- [x] Add installation script for Fabric prerequisites: docker, docker-compose, docker images.
- [x] Enable TLS
- [ ] Create variable files

## Dependencies

### Terraform

- **MAC OSX**:

  `brew install terraform`

- **Ubuntu**:

  `wget https://releases.hashicorp.com/terraform/0.12.6/terraform_0.12.6_linux_amd64.zip`

  `sudo unzip ./terraform_0.12.6_linux_amd64.zip -d /usr/local/bin/`

### Google Platform SDK

- **MAC OSX**:

- **Ubuntu**:

  `$ export CLOUD_SDK_REPO="cloud-sdk-$(lsb_release -c -s)"`

  `$ echo "deb http://packages.cloud.google.com/apt $CLOUD_SDK_REPO main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list`

  `$ curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -`

  `$ sudo apt-get update && sudo apt-get install google-cloud-sdk`

  

## Local testnet setup

1- GCP login .json file is needed to execute. You can find where to obtain it [here](https://cloud.google.com/docs/authentication/production?hl=es-419)

2- Download this file at ./secret/DLTTesting-Credentials.json (this is include in .gitignore)

COMPLETAR

2- `./initialize.sh`

## Important note

Do not publish secret enrollment password contained in /CA/ca-bootstrap-command.yaml. Change the secret for live environments

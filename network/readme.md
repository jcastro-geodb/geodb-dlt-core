# GeoDB network bootstrap

## TODOs

- [x] Add installation script for Fabric prerequisites: docker, docker-compose, docker images.
- [ ] Enable TLS
- [ ] Implement tests
- [ ] Customize node names. Implement script for generic node deployment and network peer join.
- [ ] Implement business logic for smart contract interaction
- [ ] Implement business logic for datasets addition, purchase, etc.

## Setup

1- First, run CA-Bootstrap.sh - it will spawn cryptomaterials: root certificates, user certificates, private keys, Fabric's MSPs...
2- Second, run channel-config.sh - it will spawn genesis blocks for Fabric.
3- Optionally, check that everything is fine running start.sh. This step can be done from the client GUI application.

From there you should be able to run the client GUI application.

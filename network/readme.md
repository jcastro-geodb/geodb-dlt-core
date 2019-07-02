# GeoDB network bootstrap

## TODOs

- [x] Add installation script for Fabric prerequisites: docker, docker-compose, docker images.
- [x] Enable TLS
- [ ] Implement tests
- [ ] Customize node names. Implement script for generic node deployment and network peer join.
- [ ] Implement business logic for smart contract interaction
- [ ] Implement business logic for datasets addition, purchase, etc.

## Local testnet setup

1- ca-root.geodb.com should be recognized by the host as 127.0.0.1 (edit your hosts file to add this).
2- cd to /build-local-testnet and run initialize.sh. This will spawn the needed cryptomaterials.
3- Optionally, check that everything is fine running start.sh. This step can be done from the client GUI application.

From there you should be able to run the client GUI application.

## Important note

Do not publish secret enrollment password contained in /CA/ca-bootstrap-command.yaml. Change the secret for live environments

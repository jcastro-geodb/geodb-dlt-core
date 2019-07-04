import path from "path";
import fs from "fs-extra";
import YAML from "json2yaml";

const setupNode = params => {
  // return new SetupNode(params);

  const { domain } = params;
  let orgName;

  for (let i = domain.length - 1; i >= 0; i--) {
    if (domain.charAt(i) === ".") {
      orgName = domain.substr(0, i);
      break;
    } else if (i === 0) {
      throw new Error("org name is not a domain");
    }
  }

  console.log("AQUIIIII");
  console.log(orgName);

  const yamlPath = path.resolve(process.cwd(), "./../network/node-docker-compose.yaml");

  let services = {};

  let environment = [];
  environment.push(`CORE_PEER_ID=peer0.${domain}`);
  environment.push(`CORE_PEER_ADDRESS=peer0.${domain}:7051`);
  environment.push(`CORE_PEER_LOCALMSPID=${orgName}MSP`);
  environment.push(`CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/peer/`);
  environment.push(`CORE_PEER_GOSSIP_EXTERNALENDPOINT=peer0.${domain}:7051`);

  let volumes = [];
  volumes.push(`./crypto-config/${domain}/peers/peer0.${domain}/msp:/etc/hyperledger/msp/peer`);
  let ports = [];
  ports.push("8051:7051");
  ports.push("8053:7053");

  services[`peer0.${domain}`] = {
    container_name: `peer0.${domain}`,
    extends: { file: "./bases/peer-base.yaml", service: "peer" },
    environment,
    volumes,
    ports
  };

  environment = [];
  environment.push(`CORE_PEER_ID=clipeer0.${domain}`);
  environment.push(`CORE_PEER_ADDRESS=peer0.${domain}:7051`);
  environment.push(`CORE_PEER_LOCALMSPID=${orgName}MSP`);
  environment.push(`CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@${domain}/msp`);

  volumes = [];
  volumes.push(`./crypto-config/${domain}:/etc/hyperledger/msp`);

  services[`clipeer0.${domain}`] = {
    container_name: `clipeer0.${domain}`,
    extends: { file: "./bases/cli-base.yaml", service: "cli" },
    depends_on: [`peer0.${domain}`],
    environment,
    volumes
  };

  const json = {
    version: "2",
    networks: { default: { external: { name: "geodb_geodb" } } },
    services
  };

  const yamlText = YAML.stringify(json);

  fs.writeFileSync(yamlPath, yamlText);
};

export default setupNode;

//
//   clipeer0.operations.geodb.com:
//     extends:
//       file: ../bases/cli-base.yaml
//       service: cli
//     container_name: clipeer0.operations.geodb.com
//     environment:
//       - CORE_PEER_ID=clipeer0.operations.geodb.com
//       - CORE_PEER_ADDRESS=peer0.operations.geodb.com:7051
//       - CORE_PEER_LOCALMSPID=geodbMSP
//       - CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@operations.geodb.com/msp
//     volumes:
//       - ../crypto-config/operations.geodb.com:/etc/hyperledger/msp
//     depends_on:
//       - peer0.operations.geodb.com
//     networks:
//       - geodb

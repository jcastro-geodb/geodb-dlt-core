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

  const mspDir = `../crypto-config/${domain}/peers/peer0.${domain}/msp`;

  const nodeArtifactsPath = path.resolve(process.cwd(), "../network/node-artifacts");

  if (fs.existsSync(nodeArtifactsPath) === false) {
    fs.mkdirSync(nodeArtifactsPath, { recursive: true });
  }

  const composerPath = path.resolve(process.cwd(), "../network/node-artifacts/node-docker-compose.yaml");

  let services = {};

  let environment = [];
  environment.push(`CORE_PEER_ID=peer0.${domain}`);
  environment.push(`CORE_PEER_ADDRESS=peer0.${domain}:7051`);
  environment.push(`CORE_PEER_LOCALMSPID=${orgName}MSP`);
  environment.push(`CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/peer/`);
  environment.push(`CORE_PEER_GOSSIP_EXTERNALENDPOINT=peer0.${domain}:7051`);

  let volumes = [];
  volumes.push(`${mspDir}:/etc/hyperledger/msp/peer`);
  let ports = [];
  ports.push("8051:7051");
  ports.push("8053:7053");

  services[`peer0.${domain}`] = {
    container_name: `peer0.${domain}`,
    extends: { file: "../bases/peer-base.yaml", service: "peer" },
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
  volumes.push(`../crypto-config/${domain}:/etc/hyperledger/msp`);

  services[`clipeer0.${domain}`] = {
    container_name: `clipeer0.${domain}`,
    extends: { file: "../bases/cli-base.yaml", service: "cli" },
    depends_on: [`peer0.${domain}`],
    environment,
    volumes
  };

  const composerJSON = {
    version: "2",
    networks: { default: { external: { name: "geodb_geodb" } } },
    services
  };

  const composerYaml = YAML.stringify(composerJSON);

  fs.writeFileSync(composerPath, composerYaml);

  const configtxPath = path.resolve(process.cwd(), "../network/node-artifacts/configtx.yaml");

  const anchorPeers = [{ Host: `peer0.${domain}`, Port: 7051 }];
  const policies = {
    Readers: { Type: "Signature", Rule: `OR('${orgName}MSP.member')` },
    Writers: { Type: "Signature", Rule: `OR('${orgName}MSP.member')` },
    Admins: { Type: "Signature", Rule: `OR('${orgName}MSP.admin')` }
  };

  let organization = {
    Name: `${orgName}`,
    ID: `${orgName}MSP`,
    MSPDir: `${mspDir}`,
    AnchorPeers: anchorPeers,
    Policies: policies
  };

  const configtxJSON = {
    Organizations: [organization]
  };

  const configtxYaml = YAML.stringify(configtxJSON);

  fs.writeFileSync(configtxPath, configtxYaml);
};

export default setupNode;

import path from "path";
import fs from "fs-extra";
import YAML from "json2yaml";
import shell from "./../cli/spawn/shell";

const NODE_ARTIFACTS_PATH = path.resolve(process.cwd(), "../network/node-artifacts");

class SetupNode {
  constructor(params) {
    this.params = params;
  }

  on(event, callback) {
    if (this.events === undefined) this.events = {};
    this.events[event] = callback;
    return this;
  }

  generateYamlFiles(domain, orgName) {
    return new Promise((resolve, reject) => {
      try {
        const mspDir = `../crypto-config/${domain}/peers/peer0.${domain}/msp`;

        if (fs.existsSync(NODE_ARTIFACTS_PATH) === false) {
          fs.mkdirSync(NODE_ARTIFACTS_PATH, { recursive: true });
        }

        const composerPath = path.resolve(process.cwd(), `${NODE_ARTIFACTS_PATH}/node-docker-compose.yaml`);

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

        const configtxPath = path.resolve(process.cwd(), `${NODE_ARTIFACTS_PATH}/configtx.yaml`);

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

        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }

  generateJsonOrgFromConfigtx(events, orgName) {
    let generatedJSON = undefined;

    return new Promise((resolve, reject) => {
      const cwd = path.resolve(process.cwd(), NODE_ARTIFACTS_PATH);

      const args = [`-configPath`, `${NODE_ARTIFACTS_PATH}`, `-printOrg`, `${orgName}`];

      const p = shell("configtxgen", args, cwd);

      if (events["stderr"]) p.stderr.on("data", events["stderr"]);

      p.stdout.on("data", data => {
        generatedJSON = data;
        const orgJsonPath = path.resolve(process.cwd(), `${NODE_ARTIFACTS_PATH}/${orgName}-print.json`);
        fs.writeFileSync(orgJsonPath, data);
      });

      p.on("close", code => {
        if (code === 0 && typeof generatedJSON === "object") resolve(code);
        else reject(code);
      });
    });
  }

  run() {
    const { params, generateYamlFiles, generateJsonOrgFromConfigtx, events } = this;
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

    return new Promise((resolve, reject) => {
      generateYamlFiles(domain, orgName)
        .then(result => {
          if (result !== true) throw new Error(result);

          return generateJsonOrgFromConfigtx(events, orgName);
        })
        .then(result => {
          if (result === 0) resolve(true);
          else reject(result);
        })
        .catch(error => {
          reject(error);
        });
    });
  }
}

const setupNode = params => {
  return new SetupNode(params);
};

export default setupNode;

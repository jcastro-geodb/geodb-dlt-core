import path from "path";
import fs from "fs-extra";
import YAML from "json2yaml";
import shell from "./../cli/spawn/shell";
import portastic from "portastic";
const { rootCAPort, localTestnetCredentials } = require("./../constants/ca.json");
const environment = window.require("electron").remote.process.env;

class SetupNode {
  constructor(params, db, mode) {
    this.params = params;
    this.db = db;
    this.mode = mode;
  }

  on(event, callback) {
    if (this.events === undefined) this.events = {};
    this.events[event] = callback;
    return this;
  }

  generateCryptoMaterials = params => {
    if (this.events["updateProgress"]) this.events.updateProgress("Generating crypto-materials");

    return new Promise((resolve, reject) => {
      portastic
        .find({
          min: 7600,
          max: 7699
        })
        .then(ports => {
          const intermediateCAPort = ports[Math.floor(Math.random() * ports.length)];

          const args = [
            `--orgs`,
            `${params.domain}:1:0:${rootCAPort}:${localTestnetCredentials}:${intermediateCAPort}`
          ];

          if (params.overwrite) args.push(`--recreate`, `${params.overwrite}`);

          const p = shell(". generate-crypto-materials.sh", args, `${environment.GDBROOT}/network/build-local-testnet`);

          if (this.events["stdout"]) p.stdout.on("data", this.events["stdout"]);

          if (this.events["stderr"]) p.stderr.on("data", this.events["stderr"]);

          p.on("close", code => {
            if (code === 0) resolve(code);
            else reject(code);
          });
        })
        .catch(error => {
          reject(error);
        });
    });
  };

  generateYamlFiles = (domain, orgName, artifactsPath) => {
    if (this.events["updateProgress"]) this.events.updateProgress("Generating node YAML files");

    return new Promise(async (resolve, reject) => {
      try {
        const mspDir = `${environment.GDBROOT}/network/crypto-config/${domain}/peers/peer0.${domain}/msp`;

        if (fs.existsSync(artifactsPath) === false) {
          fs.mkdirSync(artifactsPath, { recursive: true });
        }

        const composerPath = path.resolve(process.cwd(), `${artifactsPath}/node-docker-compose.yaml`);

        let services = {};

        let containerEnvVars = [];
        containerEnvVars.push(`CORE_PEER_ID=peer0.${domain}`);
        containerEnvVars.push(`CORE_PEER_ADDRESS=peer0.${domain}:7051`);
        containerEnvVars.push(`CORE_PEER_LOCALMSPID=${orgName}MSP`);
        containerEnvVars.push(`CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/peer/`);
        containerEnvVars.push(`CORE_PEER_GOSSIP_EXTERNALENDPOINT=peer0.${domain}:7051`);

        let volumes = [];
        volumes.push(`${mspDir}:/etc/hyperledger/msp/peer`);

        const availablePorts = await portastic.find({
          min: 8000,
          max: 9000
        });

        let ports = [];

        ports.push(`${availablePorts[Math.floor(Math.random() * availablePorts.length)]}:7051`);
        ports.push(`${availablePorts[Math.floor(Math.random() * availablePorts.length)]}:7053`);

        services[`peer0.${domain}`] = {
          container_name: `peer0.${domain}`,
          extends: { file: "../../../bases/peer-base.yaml", service: "peer" },
          environment: containerEnvVars,
          volumes,
          ports
        };

        containerEnvVars = [];
        containerEnvVars.push(`CORE_PEER_ID=clipeer0.${domain}`);
        containerEnvVars.push(`CORE_PEER_ADDRESS=peer0.${domain}:7051`);
        containerEnvVars.push(`CORE_PEER_LOCALMSPID=${orgName}MSP`);
        containerEnvVars.push(`CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@${domain}/msp`);

        volumes = [];
        volumes.push(`../../../crypto-config/${domain}:/etc/hyperledger/msp`);

        services[`clipeer0.${domain}`] = {
          container_name: `clipeer0.${domain}`,
          extends: { file: "../../../bases/cli-base.yaml", service: "cli" },
          depends_on: [`peer0.${domain}`],
          environment: containerEnvVars,
          volumes
        };

        const composerJSON = {
          version: "2",
          networks: { default: { external: { name: "geodb_geodb" } } },
          services
        };

        const composerYaml = YAML.stringify(composerJSON);

        fs.writeFileSync(composerPath, composerYaml);

        const configtxPath = path.resolve(process.cwd(), `${artifactsPath}/configtx.yaml`);

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

        resolve({
          success: true,
          composerPath,
          composerJSON: JSON.stringify(composerJSON),
          configtxJSON: JSON.stringify(configtxJSON)
        });
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  };

  generateJsonOrgFromConfigtx = (orgName, artifactsPath) => {
    if (this.events["updateProgress"]) this.events.updateProgress("Generating node configtx JSON");

    let generatedJSON = undefined;

    return new Promise((resolve, reject) => {
      const cwd = path.resolve(process.cwd(), artifactsPath);

      const args = [`-configPath`, `${artifactsPath}`, `-printOrg`, `${orgName}`];

      const p = shell("configtxgen", args, cwd);

      if (this.events["stderr"]) p.stderr.on("data", this.events["stderr"]);

      p.stdout.on("data", data => {
        generatedJSON = data;
        const orgJsonPath = path.resolve(process.cwd(), `${artifactsPath}/configtx-print.json`);
        fs.writeFileSync(orgJsonPath, data);
      });

      p.on("close", code => {
        if (code === 0 && typeof generatedJSON === "object") resolve(code);
        else reject(code);
      });
    });
  };

  buildUpdateDeltaWithConfigTxlator = (updateDeltaOutputFileName, artifactsPath) => {
    if (this.events["updateProgress"]) this.events.updateProgress("Building update delta for config channel");

    return new Promise((resolve, reject) => {
      let args = [
        "-c", // CLI url to fetch current channel configuration
        "clipeer0.operations.geodb.com",
        "-u", // Orderer URL to fetch current channel configuration
        "orderer0.operations.geodb.com:7050",
        "-C", // Channel that we are requesting to join
        "rewards",
        "-i", // Path of the input file containing our organization's public crypto material
        `${artifactsPath}/configtx-print.json`,
        "-o", // Path of the output file containing the update delta to be signed by the rest of the federation
        `${environment.GDBROOT}/network/channels/${updateDeltaOutputFileName}`
      ];

      const p = shell(". configtxlator-delta-generator.sh", args, `${environment.GDBROOT}/network`);

      if (this.events["stdout"]) p.stdout.on("data", this.events["stdout"]);

      if (this.events["stderr"]) p.stderr.on("data", this.events["stderr"]);

      p.on("close", code => {
        if (code === 0) resolve(code);
        else reject(code);
      });
    });
  };

  updateLocalDatabase = (
    db,
    mode,
    domain,
    mspPath,
    artifactsPath,
    updateDeltaOutputFileName,
    composerPath,
    composerJSON,
    configtxJSON
  ) => {
    const timestamp = new Date();

    return [
      db["events"].insert({
        type: "join-request",
        mode,
        timestamp,
        approvedBy: [],
        resolved: false,
        values: { domain, mspPath, artifactsPath, updateDeltaOutputFileName }
      }),
      db[mode].update(
        { _id: `${domain}` },
        { _id: `${domain}`, domain, mspPath, composerPath, composerJSON, configtxJSON },
        { upsert: true }
      )
    ];
  };

  extractOrgNameFromDomain = domain => {
    let orgName;

    for (let i = domain.length - 1; i >= 0; i--) {
      if (domain.charAt(i) === ".") {
        orgName = domain.substr(0, i);
        break;
      } else if (i === 0) {
        throw new Error("org name is not a domain");
      }
    }

    return orgName;
  };

  run() {
    const {
      params,
      db,
      mode,
      generateCryptoMaterials,
      generateYamlFiles,
      generateJsonOrgFromConfigtx,
      buildUpdateDeltaWithConfigTxlator,
      updateLocalDatabase,
      extractOrgNameFromDomain
    } = this;
    const { domain, mspPath } = params;
    const artifactsPath = `${environment.GDBROOT}/network/node-artifacts/${mode}/${domain}`;

    let orgName = extractOrgNameFromDomain(domain);
    const updateDeltaOutputFileName = mode === "local" ? `final-update-delta-${domain}.pb` : null;

    let composerPath, composerJSON, configtxJSON;

    return new Promise((resolve, reject) => {
      generateCryptoMaterials(params)
        .then(result => {
          if (result === 0) return generateYamlFiles(domain, orgName, artifactsPath);
          else throw new Error(result);
        })
        .then(result => {
          if (result.success !== true) throw new Error(result);

          composerPath = result.composerPath;
          composerJSON = result.composerJSON;
          configtxJSON = result.configtxJSON;

          return generateJsonOrgFromConfigtx(orgName, artifactsPath);
        })
        .then(result => {
          if (mode === "local" && result === 0) {
            return buildUpdateDeltaWithConfigTxlator(updateDeltaOutputFileName, artifactsPath);
          } else {
            return result;
          }
        })
        .then(result => {
          if (result === 0) {
            return updateLocalDatabase(
              db,
              mode,
              domain,
              mspPath,
              artifactsPath,
              updateDeltaOutputFileName,
              composerPath,
              composerJSON,
              configtxJSON
            );
          } else throw new Error(result);
        })
        .then(() => {
          resolve(true);
        })
        .catch(error => {
          console.error(error);
          reject(error);
        });
    });
  }
}

const setupNode = (params, db, mode) => {
  return new SetupNode(params, db, mode);
};

export default setupNode;

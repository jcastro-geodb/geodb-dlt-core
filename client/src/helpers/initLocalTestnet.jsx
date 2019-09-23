import path from "path";
import shell from "./../cli/spawn/shell";
import BaseScriptRunner from "./BaseScriptRunner.jsx";

class InitLocalTestnet extends BaseScriptRunner {
  constructor(db) {
    super(db, "local");
  }

  runInitialize = () => {
    return new Promise((resolve, reject) => {
      try {
        const cwd = path.resolve(process.cwd(), "../network/build-local-testnet");
        const args = [];
        const p = shell("./initialize.sh", args, cwd);

        if (this.events["stdout"]) p.stdout.on("data", this.events["stdout"]);

        if (this.events["stderr"]) p.stderr.on("data", this.events["stderr"]);

        p.on("close", code => {
          if (code === 0) resolve(code);
          else reject(`Could not bootstrap the network. Exit code: ${code}`);
        });
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  };

  updateLocalDatabase = () => {
    const { db, mode } = this;

    const mspPath = path.resolve(process.cwd(), `./../network/crypto-config/operations.geodb.com`);
    const composerPath = path.resolve(process.cwd(), "../network/build-local-testnet/docker-compose.yaml");

    return db[mode].update(
      { _id: `operations.geodb.com` },
      { _id: `operations.geodb.com`, domain: `operations.geodb.com`, mspPath, composerPath },
      { upsert: true }
    );
  };

  run = () => {
    if (this.events["updateProgress"]) this.events.updateProgress("Initializing network");

    const { runInitialize, updateLocalDatabase } = this;

    return new Promise((resolve, reject) => {
      runInitialize()
        .then(() => {
          return updateLocalDatabase();
        })
        .then(() => {
          resolve(true);
        })
        .catch(error => {
          console.error(error);
          reject(error);
        });
    });
  };
}

const initLocalTestnet = params => {
  return new InitLocalTestnet(params);
};

export default initLocalTestnet;

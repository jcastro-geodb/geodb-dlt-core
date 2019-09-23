import path from "path";
import shell from "./../cli/spawn/shell";
import BaseScriptRunner from "./BaseScriptRunner.jsx";

class ResetLocalTestnet extends BaseScriptRunner {
  constructor(db) {
    super(db, "local");
  }

  runReset = () => {
    return new Promise((resolve, reject) => {
      try {
        const cwd = path.resolve(process.cwd(), "../network/build-local-testnet");
        const args = [];
        const p = shell("./reset.sh", args, cwd);

        if (this.events["stdout"]) p.stdout.on("data", this.events["stdout"]);

        if (this.events["stderr"]) p.stderr.on("data", this.events["stderr"]);

        p.on("close", code => {
          resolve(code);
        });
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  };

  updateLocalDatabase = () => {
    const { db, mode } = this;
    return [db[mode].remove({}, { multi: true }), db["events"].remove({ mode }, { multi: true })];
  };

  run = () => {
    if (this.events["updateProgress"]) this.events.updateProgress("Resetting network");

    const { db, runReset, updateLocalDatabase } = this;

    return new Promise((resolve, reject) => {
      runReset()
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

const resetLocalTestnet = params => {
  return new ResetLocalTestnet(params);
};

export default resetLocalTestnet;

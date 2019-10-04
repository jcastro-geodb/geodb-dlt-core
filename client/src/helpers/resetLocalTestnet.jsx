import path from "path";
import shell from "./../cli/spawn/shell";
import BaseScriptRunner from "./BaseScriptRunner.jsx";
const environment = window.require("electron").remote.process.env;

class ResetLocalTestnet extends BaseScriptRunner {
  constructor(db) {
    super(db, "local");
  }

  runReset = () => {
    return new Promise((resolve, reject) => {
      try {
        const args = [];
        const p = shell(". reset.sh", args, `${environment.GDBROOT}/network/build-local-testnet`);

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

    const { runReset, updateLocalDatabase } = this;

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

import path from "path";
import shell from "./../cli/spawn/shell";
import BaseScriptRunner from "./BaseScriptRunner.jsx";

class ResetLocalTestnet extends BaseScriptRunner {
  constructor() {
    super(null, null);
  }

  run = () => {
    if (this.events["updateProgress"]) this.events.updateProgress("Resetting network");

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
      } catch (e) {
        reject(e);
      }
    });
  };
}

const resetLocalTestnet = params => {
  return new ResetLocalTestnet(params);
};

export default resetLocalTestnet;

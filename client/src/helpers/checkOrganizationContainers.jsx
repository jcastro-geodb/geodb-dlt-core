import path from "path";
import shell from "./../cli/spawn/shell";
import BaseScriptRunner from "./BaseScriptRunner.jsx";

class CheckOrganizationContainers extends BaseScriptRunner {
  constructor(params) {
    super(null, null);
    this.params = params;
  }

  run = () => {
    if (this.events["updateProgress"]) this.events.updateProgress("Checking containers");
    const { organization } = this.params;

    return new Promise((resolve, reject) => {
      try {
        const cwd = path.resolve(process.cwd(), "../network");

        const args = ["ps", "-aq", "-f", `name=${organization}`, `--format`, `{{.ID}}:{{.Status}}`];

        const p = shell(`docker`, args, cwd);

        let output = [];

        p.stdout.on("data", data => {
          const str = `${data}`; // The data parameter is a buffer. Convert it to string
          output = output.concat(str.split(/\r?\n/)); // Separate by line break
          if (output[output.length - 1] === "") output.pop(); // The last element might be an empty line, so remove it
          if (this.events["stdout"]) this.events["stdout"](data);
        });

        if (this.events["stderr"]) p.stderr.on("data", this.events["stderr"]);

        p.on("close", code => {
          if (code === 0) resolve(output);
          else reject(code);
        });
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  };
}

const checkOrganizationContainers = params => {
  return new CheckOrganizationContainers(params);
};

export default checkOrganizationContainers;

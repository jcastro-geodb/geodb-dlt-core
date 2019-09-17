import path from "path";
import shell from "../cli/spawn/shell";

export default () => {
  return new Promise((resolve, reject) => {
    try {
      const cwd = path.resolve(process.cwd(), "../network/build-local-testnet");
      const args = [];
      const p = shell("./reset.sh", args, cwd);

      p.on("close", code => {
        resolve(code);
      });
    } catch (e) {
      reject(e);
    }
  });
};

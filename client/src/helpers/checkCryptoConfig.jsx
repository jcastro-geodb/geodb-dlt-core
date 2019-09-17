// import path from "path";
// import fs from "fs-extra";
// import shell from "../cli/spawn/shell";

export default () => {
  return new Promise((resolve, reject) => {
    try {
      // const cwd = path.resolve(process.cwd(), "./src/helpers");
      // const args = [];
      // const p = shell("./checkLocalTestnet.sh", args, cwd);
      //
      // p.on("close", code => {
      //   if (code === 0 || code === 1) resolve(code);
      //   else reject(`Could not determine network status. Exit code: ${code}`);
      // });

      resolve(0);
    } catch (e) {
      reject(e);
    }
  });
};

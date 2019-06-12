import path from "path";
import shell from "../cli/spawn/shell.js";

const setupCertificates = (organization, onStdout, onStderr, onClose) => {
  const cwd = path.resolve(process.cwd(), "./../network");

  const args = [`${organization}:1:0:7100:7101`];

  const p = shell("./CA-Bootstrap.sh", args, cwd);

  p.stdout.on("data", onStdout);

  p.stderr.on("data", onStderr);

  p.on("close", onClose);
};

export default setupCertificates;

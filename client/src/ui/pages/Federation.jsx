import React from "react";
import { Button, Row, Col } from "react-bootstrap";
import fs from "fs-extra";
import path from "path";

import { NotificationManager } from "react-notifications";

import Loading from "../components/Loading.jsx";
import SetupOrgModal from "../components/SetupOrgModal.jsx";
import X509Data from "../components/X509Data.jsx";
import { sign as ed25519 } from "tweetnacl";

const { Certificate, PublicKey, PrivateKey, RSAPrivateKey } = require("@fidm/x509");

const errors = {
  noCertificatePathFound: "No certificate path found",
  certificatePathDoesNotExist: "Certificate path does not exist"
};

class Federation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      db: props.db,
      loadingUserConfig: true,
      showSetupOrgModal: false,
      certInfo: {}
    };
  }

  checkCertificates = () => {
    const { db } = this.state;

    let certInfo = {
      mspPath: "",
      domain: "",
      peerCrt: "",
      adminCrt: "",
      intermediateCrt: ""
    };

    db.find({ _id: "fabricMspInfo" })
      .then(result => {
        if (result.length === 0) {
          throw errors.noCertificatePathFound;
          // => Trigger CA setup
        }

        if (fs.pathExistsSync(result[0].mspPath) === false || !result[0].domain)
          throw errors.certificatePathDoesNotExist;

        certInfo["mspPath"] = result[0].mspPath;
        certInfo["domain"] = result[0].domain;

        // Peer certificate
        return fs.readFile(
          path.resolve(
            certInfo.mspPath,
            `./peers/peer0.${certInfo.domain}/msp/signcerts/peer0.${certInfo.domain}-cert.pem`
          )
        );
      })
      .then(peerCrt => {
        certInfo["peerCrt"] = peerCrt;
        const { mspPath, domain } = certInfo;

        // Admin certificate
        return fs.readFile(path.resolve(mspPath, `./peers/peer0.${domain}/msp/admincerts/Admin@${domain}-cert.pem`));

        // const files = fs.readdirSync(`${mspPath}/peers/peer0.${domain}/msp/keystore`);
        //
        // console.log(files);

        // try {
        //   const rawKey = fs.readFileSync(path.resolve(`${mspPath}/peers/peer0.${domain}/msp/keystore/${files[0]}`));
        //   // console.log(rawKey.toString());
        //   const privKey = PrivateKey.fromPEM(rawKey);
        //   console.log(privKey.keyRaw);
        //   const keypair = ed25519.keyPair.fromSeed(rawKey);
        //   // const pubKey = privKey.publicKeyRaw;
        //   console.log(keypair);
        //   // console.log(pubKey.bytes, pubKey.bytes.toString());
        // } catch (e) {
        //   console.log("AQUI");
        //   console.error(e);
        // }

        // Peer's private key
        // return fs.readFile(
        //   path.resolve(
        //     mspPath,
        //     `./peers/peer0.${domain}/msp/keystore/33fffc02e30614b562ecece790b3b7868b2b03ab8ed5c84f0e960316a9ca91f3_sk`
        //   )
        // );
      })
      .then(adminCrt => {
        certInfo["adminCrt"] = adminCrt;
        const { mspPath, domain } = certInfo;

        // Intermediate CA Certificate
        return fs.readFile(path.resolve(mspPath, `./ca/intermediate/ca-cert.pem`));
      })
      .then(intermediateCACrt => {
        certInfo["intermediateCACrt"] = intermediateCACrt;
        const { mspPath, domain } = certInfo;
      })
      .catch(err => {
        switch (err) {
          case errors.noCertificatePathFound:
            this.setState({ showSetupOrgModal: true });
            break;
          case errors.certificatePathDoesNotExist:
            this.setState({ showSetupOrgModal: true });
            break;
          default:
            NotificationManager.error(`${err}`, "Failed to run command");
            console.error(err);
        }
      })
      .finally(() => {
        this.setState({ loadingUserConfig: false, certInfo });
      });
  };

  closeSetupOrgModal = success => {
    this.setState({ showSetupOrgModal: false });

    if (success) this.checkCertificates();
  };

  delete = () => {
    const { db } = this.state;

    db.remove({ _id: "fabricMspInfo" })
      .then(result => {
        console.log("Success");
        this.checkCertificates();
      })
      .catch(error => console.log);
  };

  componentDidMount() {
    this.checkCertificates();
  }

  render() {
    const { db, loadingUserConfig, showSetupOrgModal, certInfo } = this.state;
    // const {peerCrt, adminCrt, intermediateCACrt} = certInfo;

    // const x509props = { peerCrt, adminCrt, intermediateCACrt };

    if (loadingUserConfig) return <Loading />;

    return (
      <div>
        <Row>
          <Col sm={3}>
            <h4>Reset DB</h4>
            <Button onClick={this.delete}>Reset</Button>
          </Col>
        </Row>
        <hr />
        <X509Data {...certInfo} />
        <SetupOrgModal show={showSetupOrgModal} onHide={this.closeSetupOrgModal} db={db} />
      </div>
    );
  }
}
export default Federation;

import React from "react";
import { Button, Row, Col, Card } from "react-bootstrap";
import fs from "fs-extra";
import path from "path";

import { NotificationManager } from "react-notifications";

import Loading from "../components/Loading.jsx";
import SetupOrgModal from "../components/SetupOrgModal.jsx";

const { Certificate, PublicKey } = require("@fidm/x509");

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
      certPath: null,
      peerCrt: null,
      peerKey: null,
      adminCrt: null,
      intermediateCACrt: null
    };
  }

  checkCertificates = () => {
    const { db } = this.state;

    db.find({ _id: "msp-path" })
      .then(result => {
        if (result.length === 0) {
          throw errors.noCertificatePathFound;
          // => Trigger CA setup
        }

        if (fs.pathExistsSync(result[0].mspPath) === false) throw errors.certificatePathDoesNotExist;

        this.setState({ certPath: result[0].mspPath });
        this.readCert();
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
        this.setState({ loadingUserConfig: false });
      });
  };

  closeSetupOrgModal = success => {
    this.setState({ showSetupOrgModal: false });

    if (success) this.checkCertificates();
  };

  delete = () => {
    const { db } = this.state;

    db.remove({ _id: "msp-path" })
      .then(result => {
        console.log("Success");
        this.checkCertificates();
      })
      .catch(error => console.log);
  };

  readCert = () => {
    const { certPath } = this.state;

    if (certPath) {
      this.setState({
        peerCrt: fs
          .readFileSync(path.resolve(certPath, "./peers/peer0.rrreche.es/msp/signcerts/peer0.rrreche.es-cert.pem"))
          .toString(),
        peerKey: fs
          .readFileSync(
            path.resolve(
              certPath,
              "./peers/peer0.rrreche.es/msp/keystore/33fffc02e30614b562ecece790b3b7868b2b03ab8ed5c84f0e960316a9ca91f3_sk"
            )
          )
          .toString(),
        adminCrt: fs
          .readFileSync(path.resolve(certPath, "./peers/peer0.rrreche.es/msp/admincerts/Admin@rrreche.es-cert.pem"))
          .toString(),
        intermediateCACrt: fs.readFileSync(path.resolve(certPath, "./ca/intermediate/ca-cert.pem")).toString()
      });
    }
  };

  componentDidMount() {
    this.checkCertificates();
  }

  x509data = () => {
    const { peerCrt, adminCrt, intermediateCACrt } = this.state;

    try {
      const peerCertificate = Certificate.fromPEM(peerCrt);
      const adminCertificate = Certificate.fromPEM(adminCrt);
      const intermediateCertificate = Certificate.fromPEM(intermediateCACrt);

      const children = [];

      children.push({ key: "peerCertificate.issuer", value: peerCertificate.issuer });
      children.push({
        key: "peerCertificate.publicKey.toPEM()",
        value: peerCertificate.publicKey
          .toPEM()
          .toString()
          .replace(/\n/g, "")
      });
      children.push({
        key: "adminCertificate.issuer",
        value: adminCertificate.issuer
      });

      children.push({
        key: "adminCertificate.publicKey.toPEM()",
        value: adminCertificate.publicKey
          .toPEM()
          .toString()
          .replace(/\n/g, "")
      });

      children.push({
        key: "adminCertificate.isIssuer(intermediateCertificate)",
        value: adminCertificate.isIssuer(intermediateCertificate)
      });
      // JSON.stringify(cert.issuer) => Hyperledger Fabric CA

      const result = children.map(child => {
        return (
          <div key={child.key}>
            {" "}
            <strong>{child.key}</strong>
            <p>{JSON.stringify(child.value)}</p> <hr />{" "}
          </div>
        );
      });

      return <div>{result}</div>;
    } catch (e) {
      console.error(e);
    }

    // const cert = PublicKey.fromPEM(peerCrt);

    // return <div>{cert.publicKey.keyRaw}</div>;
  };

  render() {
    const { db, loadingUserConfig, showSetupOrgModal, peerCrt, peerKey } = this.state;

    if (loadingUserConfig) return <Loading />;

    return (
      <div>
        <Row>
          <Col sm={3}>
            <h4>Reset DB</h4>
            <Button onClick={this.delete}>Reset</Button>
          </Col>
          <Col sm={3}>
            <h4>Read certificate</h4>
            <Button onClick={this.readCert}>Read file</Button>
          </Col>
        </Row>
        <hr />
        <Row>
          <Col sm={6}>
            {peerCrt && (
              <Card>
                <Card.Body>
                  <strong>Peer certificate .PEM:</strong>
                  <br /> `${peerCrt}`
                </Card.Body>
              </Card>
            )}
          </Col>
          <Col sm={6}>
            {peerKey && (
              <Card>
                <Card.Body>
                  <strong>Peer certificate SK:</strong>
                  <br /> `${peerKey}`
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
        <Row>
          <Col sm={12}>
            <Card>
              <Card.Header>Data</Card.Header>
              <Card.Body>{this.x509data()}</Card.Body>
            </Card>
          </Col>
        </Row>
        <SetupOrgModal show={showSetupOrgModal} onHide={this.closeSetupOrgModal} db={db} />
      </div>
    );
  }
}
export default Federation;

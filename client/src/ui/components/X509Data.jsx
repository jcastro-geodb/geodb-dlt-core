import React from "react";
import fs from "fs-extra";
import path from "path";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";

import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
const { Certificate } = require("@fidm/x509");

class X509Data extends React.Component {
  state = {
    show: false
  };

  renderData = props => {
    //   // Peer's private key
    //   // return fs.readFile(
    //   //   path.resolve(
    //   //     mspPath,
    //   //     `./peers/peer0.${domain}/msp/keystore/33fffc02e30614b562ecece790b3b7868b2b03ab8ed5c84f0e960316a9ca91f3_sk`
    //   //   )
    //   // );

    try {
      const { mspPath, domain } = props.organization;

      const peerCrt = fs.readFileSync(
        path.resolve(mspPath, `./peers/peer0.${domain}/msp/signcerts/peer0.${domain}-cert.pem`)
      );

      const adminCrt = fs.readFileSync(
        path.resolve(mspPath, `./peers/peer0.${domain}/msp/admincerts/Admin@${domain}-cert.pem`)
      );

      const intermediateCACrt = fs.readFileSync(path.resolve(mspPath, `./ca/intermediate/ca-cert.pem`));

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

      const data = children.map(child => {
        return (
          <div key={child.key}>
            {" "}
            <strong>{child.key}</strong>
            <p>{JSON.stringify(child.value)}</p> <hr />{" "}
          </div>
        );
      });

      return (
        <div>
          <Row>
            <Col sm={12}>
              {peerCrt && (
                <Card>
                  <Card.Body>
                    <strong>Peer certificate .PEM:</strong>
                    <br /> `${peerCrt.toString()}`
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
          <Row>
            <Col sm={12}>
              <Card>
                <Card.Header>Data</Card.Header>
                <Card.Body>{data}</Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      );
    } catch (e) {
      console.error(e);
    }

    return <div>Could not load the organization's data</div>;

    // const cert = PublicKey.fromPEM(peerCrt);

    // return <div>{cert.publicKey.keyRaw}</div>;
  };

  render() {
    const { show } = this.state;

    return (
      <span>
        <Button size="sm" variant="dark" onClick={() => this.setState({ show: true })}>
          Show certificate data
        </Button>
        <Modal
          size="lg"
          show={show}
          aria-labelledby="contained-modal-title-vcenter"
          centered
          onHide={() => this.setState({ show: false })}
        >
          <Modal.Header closeButton>
            <Modal.Title id="contained-modal-title-vcenter" className="w-100 text-center">
              Certificate data
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>{this.renderData(this.props)}</Modal.Body>
        </Modal>
      </span>
    );
  }
}

export default X509Data;

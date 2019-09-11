import React from "react";
import { Row, Col, Card } from "react-bootstrap";
const { Certificate, PublicKey, PrivateKey } = require("@fidm/x509");

export default props => {
  const { peerCrt, adminCrt, intermediateCACrt, peerKey } = props;

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
    // console.error(e);
  }

  return null;

  // const cert = PublicKey.fromPEM(peerCrt);

  // return <div>{cert.publicKey.keyRaw}</div>;
};

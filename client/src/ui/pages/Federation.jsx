import React from "react";
import { Button, Row, Col } from "react-bootstrap";
import fs from "fs-extra";
import path from "path";

import { NotificationManager } from "react-notifications";

import Loading from "../components/Loading.jsx";
import SetupOrgModal from "../components/SetupOrgModal.jsx";

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
      certPem: null,
      certKey: null
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
        certPem: fs.readFileSync(path.resolve(certPath, "./ca/intermediate/ca-cert.pem")).toString()
      });
    }
  };

  componentDidMount() {
    this.checkCertificates();
  }

  render() {
    const { db, loadingUserConfig, showSetupOrgModal, certPem, certKey } = this.state;

    if (loadingUserConfig) return <Loading />;

    return (
      <div>
        <Row>
          <Col sm={6}>
            <h4>Reset local DB</h4>
            <Button onClick={this.delete}>Reset</Button>
          </Col>
          <Col sm={6}>
            <h4>Read certificate</h4>
            <Button onClick={this.readCert}>Read file</Button>
            {certPem && (
              <p>
                <strong>Certificate PEM:</strong>
                <br /> `${certPem}`
              </p>
            )}
            {certKey && <p>Certificate key: </p>}
          </Col>
        </Row>
        <SetupOrgModal show={showSetupOrgModal} onHide={this.closeSetupOrgModal} db={db} />
      </div>
    );
  }
}
export default Federation;

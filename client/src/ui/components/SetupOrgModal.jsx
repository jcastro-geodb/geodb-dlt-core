import React from "react";
import path from "path";
import fs from "fs-extra";
import { Modal, Spinner, Button } from "react-bootstrap";
import SetupOrgForm from "./SetupOrgForm.jsx";

import setupCertificates from "./../../setups/certificates.jsx";

class SetupOrgModal extends React.Component {
  state = {
    setupStarted: false,
    setupFinished: false,
    setupSuccess: false
  };

  startSetup = params => {
    this.setState({ setupStarted: true });
    const { db } = this.props;

    setupCertificates(
      params,
      data => {
        console.log(`${data}`);
      },
      data => {
        console.error(`${data}`);
      },
      code => {
        console.log(`child process exited with code ${code}`);

        const mspPath = path.resolve(process.cwd(), `./../network/crypto-config/${params.domain}`);

        if (code === 0 && fs.pathExistsSync(mspPath) === true) {
          db.update({ _id: "msp-path" }, { _id: "msp-path", mspPath }, { upsert: true })
            .then(result => {
              this.setState({ setupSuccess: true });
            })
            .catch(error => {
              console.error(error);
              this.setState({ setupSuccess: false });
            })
            .finally(() => {
              this.setState({ setupFinished: true });
            });
        } else {
          this.setState({ setupFinished: true });
        }
      }
    );
  };

  render() {
    const { setupStarted, setupFinished, setupSuccess } = this.state;
    const { onHide } = this.props;

    return (
      <Modal {...this.props} size="lg" aria-labelledby="contained-modal-title-vcenter" centered backdrop="static">
        <Modal.Header>
          <Modal.Title id="contained-modal-title-vcenter" className="w-100 text-center">
            Federation setup
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {setupStarted === false ? this.renderForm() : null}{" "}
          {setupStarted === true && setupFinished === false ? this.renderSetupProcess() : null}
          {setupStarted === true && setupFinished === true ? this.renderSetupFinished() : null}
          {setupFinished === true && (
            <Button block variant="outline-primary" onClick={() => onHide(setupSuccess)}>
              Close
            </Button>
          )}
        </Modal.Body>
      </Modal>
    );
  }

  renderForm = () => {
    const { onHide } = this.props;

    return (
      <div>
        <p>
          To join the federation, it is needed to generate X.509 certificates that will uniquely identify your
          membership to other actors. The node manager has not been able to detect these certificates and is now going
          to start the setup process
        </p>
        <p>Please, fill the following form to before starting the process</p>

        <SetupOrgForm handleCancel={onHide} startSetup={this.startSetup} />
      </div>
    );
  };

  renderSetupProcess = () => {
    return (
      <div className="text-center">
        <p>Please wait while the setup process finishes</p>
        <Spinner animation="grow" variant="primary" />
        <Spinner animation="grow" variant="success" />
        <Spinner animation="grow" variant="danger" />
        <Spinner animation="grow" variant="warning" />
        <Spinner animation="grow" variant="info" />
      </div>
    );
  };

  renderSetupFinished = () => {
    if (this.state.setupSuccess === true)
      return (
        <div className="text-center text-success">
          <i className="far fa-check-circle" />
          <p>Certificates installed successfully</p>
        </div>
      );
    else
      return (
        <div className="text-center text-danger">
          <i className="fas fa-exclamation-triangle" />
          <p>Something went wrong</p>
        </div>
      );
  };
}

export default SetupOrgModal;

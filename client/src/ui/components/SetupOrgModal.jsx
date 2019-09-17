import React from "react";
import path from "path";
import { Modal, Spinner, Button } from "react-bootstrap";
import SetupOrgForm from "./SetupOrgForm.jsx";

import setupNode from "./../../setups/node.jsx";

class SetupOrgModal extends React.Component {
  state = {
    setupStarted: false,
    loadingMsg: "",
    setupFinished: false,
    setupSuccess: false
  };

  startSetup = params => {
    this.setState({ setupStarted: true });
    const { db, mode } = this.props;

    const mspPath = path.resolve(process.cwd(), `./../network/crypto-config/${params.domain}`);
    params.mspPath = mspPath;

    setupNode(params, db, mode)
      .on("updateProgress", loadingMsg => this.setState({ loadingMsg }))
      .on("stdout", data => console.log(`${data}`))
      .on("stderr", data => console.error(`${data}`))
      .run()
      .then(() => {
        this.setState({ setupSuccess: true });
      })
      .catch(error => {
        console.error(error);
        this.setState({ setupSuccess: false });
      })
      .finally(() => {
        this.setState({ setupFinished: true });
      });
  };

  onClose = () => {
    const { onHide } = this.props;

    const { setupSuccess } = this.state;
    this.setState({ setupStarted: false, setupFinished: false, setupSuccess: false });
    onHide(setupSuccess);
  };

  render() {
    const { setupStarted, setupFinished } = this.state;

    return (
      <Modal {...this.props} size="lg" aria-labelledby="contained-modal-title-vcenter" centered backdrop="static">
        <Modal.Header>
          <Modal.Title id="contained-modal-title-vcenter" className="w-100 text-center">
            Add organization
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {setupStarted === false ? this.renderForm() : null}{" "}
          {setupStarted === true && setupFinished === false ? this.renderSetupProcess() : null}
          {setupStarted === true && setupFinished === true ? this.renderSetupFinished() : null}
          {setupFinished === true && (
            <Button block variant="outline-primary" onClick={this.onClose}>
              Close
            </Button>
          )}
        </Modal.Body>
      </Modal>
    );
  }

  renderForm = () => {
    return (
      <div>
        <p>This process will generate X.509 certificates that will uniquely identify your membership to the network.</p>
        <p>Please, fill the following form to before starting the process</p>

        <SetupOrgForm handleCancel={this.onClose} startSetup={this.startSetup} />
      </div>
    );
  };

  renderSetupProcess = () => {
    return (
      <div className="text-center">
        <p>Please wait while the setup process finishes</p>
        <p>
          <small>{this.state.loadingMsg}</small>
        </p>
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

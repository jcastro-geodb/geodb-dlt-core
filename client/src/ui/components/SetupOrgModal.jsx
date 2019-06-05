import React from "react";
import Modal from "react-bootstrap/Modal";
import SetupOrgForm from "./SetupOrgForm.jsx";

class SetupOrgModal extends React.Component {
  state = {
    setupStarted: false
  };

  startSetup = () => {
    this.setState({ setupStarted: true });
  };

  render() {
    const { onHide } = this.props;

    return (
      <Modal {...this.props} size="lg" aria-labelledby="contained-modal-title-vcenter" centered backdrop="static">
        <Modal.Header>
          <Modal.Title id="contained-modal-title-vcenter">Federation setup</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            To join the federation, it is needed to generate X.509 certificates that will uniquely identify your
            membership to other actors. The node manager has not been able to detect these certificates and is now going
            to start the setup process
          </p>
          <p>Please, fill the following form to before starting the process</p>

          <SetupOrgForm handleCancel={onHide} />
        </Modal.Body>
      </Modal>
    );
  }
}

export default SetupOrgModal;

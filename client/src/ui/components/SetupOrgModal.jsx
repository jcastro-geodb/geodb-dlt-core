import React from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import LoadingButton from "./LoadingButton.jsx";
import { Container, Row, Col } from "react-bootstrap";

class SetupOrgModal extends React.Component {
  state = {
    setupStarted: false
  };

  startSetup = () => {
    this.setState({ setupStarted: true });
  };

  render() {
    return (
      <Modal
        {...this.props}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
        backdrop="static"
      >
        <Modal.Header>
          <Modal.Title id="contained-modal-title-vcenter">
            Federation setup
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            To join the federation, it is needed to generate X.509 certificates
            that will uniquely identify your membership to other actors. The
            node manager has not been able to detect these certificates and is
            now going to start the setup process
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Container block fluid>
            <Row>
              <Col xs={6}>
                <LoadingButton
                  onClick={this.startSetup}
                  loading={this.state.setupStarted}
                  block
                >
                  Start setup
                </LoadingButton>
              </Col>
              <Col xs={6}>
                <Button
                  disabled={this.state.setupStarted}
                  variant="outline-danger"
                  onClick={this.props.onHide}
                  block
                >
                  Cancel
                </Button>
              </Col>
            </Row>
          </Container>
        </Modal.Footer>
      </Modal>
    );
  }
}

export default SetupOrgModal;

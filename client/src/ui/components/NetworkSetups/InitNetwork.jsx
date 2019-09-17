import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import LoadingButton from "../LoadingButton.jsx";

import initLocalTestnet from "../../../helpers/initLocalTestnet.jsx";
import resetLocalTestnet from "../../../helpers/resetLocalTestnet.jsx";
import SetupOrgModal from "../SetupOrgModal.jsx";

class InitNetwork extends React.Component {
  state = {
    loading: false,
    initializeLocalTestnetCompleted: false,
    showSetupOrgModal: false
  };

  closeSetupOrgModal = success => {
    this.setState({ showSetupOrgModal: false });
    this.props.onFinished();
  };

  initializeLocalTestnet = () => {
    this.setState({ loading: true });

    resetLocalTestnet()
      .then(() => {
        return initLocalTestnet();
      })
      .then(result => {
        this.setState({ loading: false, initializeLocalTestnetCompleted: true, showSetupOrgModal: true });
      })
      .catch(error => {
        console.error(error);
      });
  };

  skip = () => {
    this.props.onFinished(true);
  };

  render() {
    const { db } = this.props;
    const mode = "local";
    const { loading, initializeLocalTestnetCompleted, showSetupOrgModal } = this.state;

    return (
      <div>
        <h1>Base network not running</h1>
        <p>Could not detect a local network running. What do you want to do?</p>
        <hr />

        <Row>
          <Col sm={6}>
            <Button
              size="lg"
              block
              variant="outline-danger"
              onClick={this.skip}
              disabled={loading || initializeLocalTestnetCompleted}
            >
              I will run it manually later
            </Button>
          </Col>

          <Col sm={6}>
            <LoadingButton
              size="lg"
              block
              variant="primary"
              onClick={this.initializeLocalTestnet}
              loading={loading}
              disabled={initializeLocalTestnetCompleted}
            >
              Initialize the local testnet
            </LoadingButton>
          </Col>
        </Row>
        <SetupOrgModal show={showSetupOrgModal} onHide={this.closeSetupOrgModal} db={db} mode={mode} />
      </div>
    );
  }
}

export default InitNetwork;

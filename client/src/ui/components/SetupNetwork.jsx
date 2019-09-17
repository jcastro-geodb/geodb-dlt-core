import React from "react";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Jumbotron from "react-bootstrap/Jumbotron";

import FirstSetup from "./NetworkSetups/FirstSetup.jsx";
import InitNetwork from "./NetworkSetups/InitNetwork.jsx";

class SetupNetwork extends React.Component {
  onFinished = skip => {
    this.props.handleSetupFinished(skip);
  };

  render() {
    const { db, mode, setupNeeded } = this.props;

    return (
      <Container style={{ minHeight: "100vh", height: "100vh" }}>
        <Row className="h-100">
          <Col xs={12} className="my-auto">
            <Jumbotron>
              {setupNeeded === "first" ? <FirstSetup db={db} onFinished={this.onFinished} /> : null}
              {setupNeeded === "initNetwork" ? <InitNetwork db={db} mode={mode} onFinished={this.onFinished} /> : null}
              {setupNeeded === "addOrganization" ? "Add org" : null}
            </Jumbotron>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default SetupNetwork;

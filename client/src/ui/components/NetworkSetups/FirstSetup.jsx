import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import LoadingButton from "../LoadingButton.jsx";

class FirstSetup extends React.Component {
  state = {
    loading: false
  };

  setupLocalTestnet = () => {
    this.setState({ loading: true });
    const { db } = this.props;
    db.preferences
      .update({ _id: "mode" }, { _id: "mode", value: "local" }, { upsert: true })
      .then(() => {
        this.setState({ loading: false });
        this.props.onFinished();
      })
      .catch(error => {
        console.error(error);
      });
  };

  render() {
    const { loading } = this.state;

    return (
      <div>
        <h1>First run</h1>
        <p>
          The client has detected this is your first time running it. Please specify the type of network you are going
          to run
        </p>
        <hr />

        <Row>
          <Col sm={6}>
            <LoadingButton size="lg" block variant="primary" onClick={this.setupLocalTestnet} loading={loading}>
              Setup a local testnet
            </LoadingButton>
          </Col>

          <Col sm={6}>
            <Button size="lg" block variant="outline-primary" disabled={true}>
              Setup GCP testnet
            </Button>
          </Col>
        </Row>
      </div>
    );
  }
}

export default FirstSetup;

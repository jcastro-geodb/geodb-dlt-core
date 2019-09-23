import React from "react";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import shell from "../../cli/shell/shell.js";

class ContainerListItem extends React.Component {
  state = {
    status: "checking"
  };

  initPeriodicCheck = () => {
    this.checkStatus();
    this.intervalId = setInterval(() => {
      this.checkStatus();
    }, 5000);
  };

  cancelPeriodicCheck = () => {
    clearInterval(this.intervalId);
    this.intervalId = false;
  };

  checkStatus = () => {
    shell(`docker inspect -f '{{.State.Running}}' ${this.props.container}`)
      .then(result => {
        this.setState({ status: result.trim() === "true" ? "running" : "stopped" });
      })
      .catch(error => {
        this.setState({ status: "stopped" });
      });
  };

  componentDidMount() {
    this.initPeriodicCheck();
  }

  componentWillUnmount() {
    this.cancelPeriodicCheck();
  }

  render() {
    const { status } = this.state;
    const { container } = this.props;

    const nodeName = container.indexOf(".") === -1 ? container : container.substr(0, container.indexOf("."));

    return (
      <div className="d-flex justify-content-between">
        <div>{nodeName}</div>
        <Row>
          <Col>
            {status === "running" ? <Badge variant="success">Running</Badge> : null}
            {status === "stopped" ? <Badge variant="danger">Stopped</Badge> : null}
            {status === "checking" ? <Badge variant="info">Checking</Badge> : null}
          </Col>
          <Col>
            <Button size="sm" variant="dark" disabled={true}>
              Logs
            </Button>
          </Col>
        </Row>
      </div>
    );
  }
}

export default ContainerListItem;

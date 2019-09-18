import React from "react";
import shell from "../../cli/shell/shell.js";
import yaml from "js-yaml";
import fs from "fs-extra";

import Card from "react-bootstrap/Card";
import ListGroup from "react-bootstrap/ListGroup";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import { NotificationManager } from "react-notifications";

import Loading from "../components/Loading.jsx";
import LoadingButton from "../components/LoadingButton.jsx";
import ContainerStatus from "../components/ContainerStatus";
import ResetLocalTestnet from "../components/LocalTestnetManagement/ResetLocalTestnet";
import InitLocalTestnet from "../components/LocalTestnetManagement/InitLocalTestnet";

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      runningCommand: false,
      refreshing: false,
      containers: []
    };
  }

  checkFabricStatus = async () => {
    // Get document, or throw exception on error
    let containers = [];

    try {
      const dockerFile = yaml.safeLoad(fs.readFileSync("../network/build-local-testnet/docker-compose.yaml", "utf8"));

      if (dockerFile && dockerFile.services) {
        for (const [key, value] of Object.entries(dockerFile.services)) {
          try {
            let running = await shell(`docker inspect -f '{{.State.Running}}' ${key}`);
            running = running.trim() === "true" ? true : false;
            containers.push({ name: key, running, config: value });
          } catch (e) {
            containers.push({ name: key, running: false });
          }
        }
      }
    } catch (e) {
      console.log(e);
    }

    this.setState({ refreshing: false, loading: false, containers });

    // call the function
    // shell("cat ../network/docker-compose.yaml").then(result => {
    //   console.log(result);
    // });
  };

  onClickRefreshFabricStatus = () => {
    this.setState({ refreshing: true });
    this.checkFabricStatus();
  };

  onClickActions = event => {
    this.setState({ runningCommand: true });
    const command = event.target.value;

    try {
      shell(`cd ../network; ./${command}.sh`)
        .then(result => {
          console.log(result);
          this.setState({ runningCommand: false });
        })
        .then(() => {
          NotificationManager.success(`Successfully run command ${command}`, "Success");
          this.checkFabricStatus();
        })
        .catch(error => {
          NotificationManager.error(`${error}`, "Failed to run command");
          console.error(error);
        })
        .finally(() => {
          this.setState({ runningCommand: false });
        });
    } catch (e) {
      console.log(e);
    }
  };

  async componentDidMount() {
    await this.checkFabricStatus();
  }

  render() {
    const { loading, containers, refreshing, runningCommand } = this.state;

    const { db, mode } = this.props;

    if (loading) return <Loading />;

    return (
      <Row>
        <Col xs={12} sm={6}>
          <Card border="primary" className="shadow-lg p-3 mb-5">
            <Card.Header bg="primary">
              <div className="d-flex justify-content-between">
                <b>Fabric containers status</b>

                <LoadingButton
                  variant="primary"
                  size="sm"
                  onClick={this.onClickRefreshFabricStatus}
                  loading={refreshing}
                >
                  <i className="fas fa-sync-alt" />
                </LoadingButton>
              </div>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {containers.map(prop => {
                  return (
                    <ListGroup.Item key={prop.name}>
                      <ContainerStatus name={prop.name} running={prop.running} />
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <h3 className="display-4 text-center">Actions</h3>
          <InitLocalTestnet db={db} mode={mode} />
          <br />
          <LoadingButton
            value="stop"
            variant="danger"
            size="lg"
            block
            onClick={this.onClickActions}
            loading={runningCommand}
          >
            Stop
          </LoadingButton>
          <br />
          <ResetLocalTestnet db={db} mode={mode} />
          <br />
          <LoadingButton
            value="install-upg-chaincode"
            variant="info"
            size="lg"
            block
            onClick={this.onClickActions}
            loading={runningCommand}
          >
            Install / Upgrade chaincode
          </LoadingButton>
        </Col>
      </Row>
    );
  }
}

export default Home;

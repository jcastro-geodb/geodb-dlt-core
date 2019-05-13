import React from "react";
import { Alert, Badge, Card, Form, Row, Col } from "react-bootstrap";

const cardClass =
  "flex-row flex-wrap align-items-center text-center justify-content-around shadow-lg p-3 mb-5";

class FabricSettings extends React.Component {
  render() {
    return (
      <div>
        <Alert fluid dismissible variant="danger">
          <Alert.Heading>Fat fingers out of here!</Alert.Heading>
          <hr />

          <p>
            You should not be roaming these settings unless you know what you
            are doing. This is the GeoDB node configuration and is automatically
            configured on setup.
          </p>
        </Alert>
        <Row className="d-flex justify-content-between">
          <Col xs={2}>
            <Card bg="light" className={cardClass}>
              <div className="card-header border-0">
                <i class="fas fa-share-alt fa-3x" />
              </div>
              <div className="card-block px-2">
                <h5 className="card-title">Peers</h5>
                <Badge pill variant="info">
                  <p className="card-text">3</p>
                </Badge>
              </div>
            </Card>
          </Col>
          <Col xs={2}>
            <Card bg="light" className={cardClass}>
              <div className="card-header border-0">
                <i class="fas fa-database fa-3x" />
              </div>
              <div className="card-block px-2">
                <h5 className="card-title">Databases</h5>
                <Badge pill variant="info">
                  <p className="card-text">1</p>
                </Badge>
              </div>
            </Card>
          </Col>
          <Col xs={2}>
            <Card bg="light" className={cardClass}>
              <div className="card-header border-0">
                <i class="fas fa-anchor fa-3x" />
              </div>
              <div className="card-block px-2">
                <h5 className="card-title">Anchors</h5>
                <Badge pill variant="info">
                  <p className="card-text">1</p>
                </Badge>
              </div>
            </Card>
          </Col>
          <Col xs={2}>
            <Card bg="light" className={cardClass}>
              <div className="card-header border-0">
                <i class="fas fa-exclamation-circle fa-3x" />
              </div>
              <div className="card-block px-2">
                <h5 className="card-title">Issues</h5>
                <Badge pill variant="primary">
                  <p className="card-text">0</p>
                </Badge>
              </div>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col sm={6}>
            <Form>
              <Form.Group controlId="certPath">
                <Form.Label>Peer port</Form.Label>
                <Form.Control placeholder="/network/crypto-config" />
              </Form.Group>
              <Form.Group controlId="dockerPath">
                <Form.Label>Docker configuration path</Form.Label>
                <Form.Control placeholder="/network/docker-compose.yaml" />
              </Form.Group>
            </Form>
          </Col>
          <Col sm={6}>
            <Form>
              <Form.Group controlId="peerCorePort">
                <Form.Label>Peer core port</Form.Label>
                <Form.Control placeholder="7051" />
              </Form.Group>
              <Form.Group controlId="peerGossipPort">
                <Form.Label>Peer gossip port</Form.Label>
                <Form.Control placeholder="7053" />
              </Form.Group>

              <Form.Group controlId="formGridState">
                <Form.Label>World state database</Form.Label>
                <Form.Control as="select">
                  <option>LevelDB</option>
                  <option>CouchDB</option>
                  <option>MongoDB</option>
                  <option>MariaDB</option>
                </Form.Control>
              </Form.Group>
              <Form.Group controlId="peerGossipPort">
                <Form.Label>World state database port</Form.Label>
                <Form.Control placeholder="5984" />
              </Form.Group>
            </Form>
          </Col>
        </Row>
      </div>
    );
  }
}
export default FabricSettings;

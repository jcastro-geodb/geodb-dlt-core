import React from "react";
import { Badge, Button, Card, Figure, Row, Col } from "react-bootstrap";
import LoadingButton from "../components/LoadingButton.jsx";

const geoTokenIcon = require("../assets/geotoken.png");
const ethIcon = require("../assets/eth.png");

const cardClass =
  "flex-row flex-wrap align-items-center text-center justify-content-around shadow-lg p-3 mb-5";

class EthereumSettings extends React.Component {
  render() {
    return (
      <div>
        <Row className="d-flex justify-content-between">
          <Col xs={2}>
            <Card bg="light" className={cardClass}>
              <div className="card-header border-0">
                <i class="fas fa-coins fa-3x" />
              </div>
              <div className="card-block px-2">
                <h5 className="card-title">Stake</h5>
                <Badge pill variant="info">
                  <p className="card-text">500.00 G</p>
                </Badge>
              </div>
            </Card>
          </Col>
          <Col xs={2}>
            <Card bg="light" className={cardClass}>
              <div className="card-header border-0">
                <i class="fas fa-balance-scale fa-3x" />
              </div>
              <div className="card-block px-2">
                <h5 className="card-title">Vote weight</h5>
                <Badge pill variant="info">
                  <p className="card-text">20.00%</p>
                </Badge>
              </div>
            </Card>
          </Col>
          <Col xs={2}>
            <Card bg="light" className={cardClass}>
              <div className="card-header border-0">
                <i class="fas fa-university fa-3x" />
              </div>
              <div className="card-block px-2">
                <h5 className="card-title">Status</h5>
                <Badge pill variant="success">
                  <p className="card-text">Approved</p>
                </Badge>
              </div>
            </Card>
          </Col>
          <Col xs={2}>
            <Card bg="light" className={cardClass}>
              <div className="card-header border-0">
                <i class="fas fa-cube fa-3x" />
              </div>
              <div className="card-block px-2">
                <h5 className="card-title">Next block</h5>
                <Badge pill variant="primary">
                  <p className="card-text">carto.com</p>
                </Badge>
              </div>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <div class="d-inline p-2 text-secondary">
              <h5>
                Contract:{" "}
                <small>
                  <i>0xE745897C64c8DA0A15E11B000834F570eC7eA7Ad</i>
                </small>
              </h5>
              <p>
                Version: <small>1</small>
              </p>
            </div>
          </Col>
        </Row>

        <Row>
          <Col sm={6}>
            <Card border="primary" className="shadow-lg p-3 mb-5">
              <Card.Header bg="primary">
                <div className="d-flex justify-content-between">
                  <Figure>
                    <Figure.Image width={64} height={64} src={ethIcon} />
                  </Figure>
                  <h4 className="my-auto">0.58321 Ξ</h4>
                </div>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col xs={6}>
                    <Button variant="primary" size="lg" block>
                      <i class="fas fa-paper-plane" /> Send
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button variant="primary" size="lg" block>
                      <i class="fas fa-qrcode" /> Receive
                    </Button>
                  </Col>
                </Row>
                <br />
                <Row>
                  <Col xs={6}>
                    <Button variant="outline-primary" size="lg" block>
                      <i class="fas fa-key" /> Set private key
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button variant="outline-primary" size="lg" block>
                      <i class="fas fa-at" /> Set ENS address
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
            <Card border="primary" className="shadow-lg p-3 mb-5">
              <Card.Header bg="primary">
                <div className="d-flex justify-content-between">
                  <Figure>
                    <Figure.Image width={64} height={64} src={geoTokenIcon} />
                  </Figure>
                  <h4 className="my-auto">10000.00 G</h4>
                </div>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col xs={6}>
                    <Button variant="primary" size="lg" block>
                      <i class="fas fa-paper-plane" /> Send
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button variant="primary" size="lg" block>
                      <i class="fas fa-qrcode" /> Receive
                    </Button>
                  </Col>
                </Row>
                <br />
                <Row>
                  <Col xs={6}>
                    <Button variant="outline-primary" size="lg" block>
                      <i class="far fa-handshake" /> Exchange
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button variant="outline-primary" size="lg" block>
                      <i class="fas fa-hand-holding-usd" /> Earn
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6}>
            <h3 className="display-4 text-center">Actions</h3>
            <LoadingButton value="start" variant="success" size="lg" block>
              Stake tokens
            </LoadingButton>
            <LoadingButton value="stop" variant="danger" size="lg" block>
              Request withdrawk
            </LoadingButton>
            <LoadingButton value="restart" variant="primary" size="lg" block>
              Participation
            </LoadingButton>
            <LoadingButton
              value="install-upg-chaincode"
              variant="info"
              size="lg"
              block
            >
              Reward users
            </LoadingButton>
          </Col>
        </Row>
      </div>
    );
  }
}
export default EthereumSettings;

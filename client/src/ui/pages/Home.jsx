import React from "react";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import Loading from "../components/Loading.jsx";
import LoadingButton from "../components/LoadingButton.jsx";
import ContainerManager from "../components/ContainerManager";
import ResetLocalTestnet from "../components/LocalTestnetManagement/ResetLocalTestnet";
import InitLocalTestnet from "../components/LocalTestnetManagement/InitLocalTestnet";

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true
    };
  }

  async componentDidMount() {
    await this.checkFabricStatus();
  }

  render() {
    const { loading } = this.state;

    const { db, mode } = this.props;

    if (loading) return <Loading />;

    return (
      <Row>
        <Col xs={12} sm={6}>
          <ContainerManager db={db} mode={mode} />
        </Col>
        <Col xs={12} sm={6}>
          <h3 className="display-4 text-center">Actions</h3>
          <InitLocalTestnet db={db} mode={mode} callBack={this.checkFabricStatus} />
          <br />
          <ResetLocalTestnet db={db} mode={mode} callBack={this.checkFabricStatus} />
          <br />
          <LoadingButton value="stop" variant="danger" size="lg" block disabled={true}>
            Pause
          </LoadingButton>
          <br />
          <LoadingButton value="install-upg-chaincode" variant="info" size="lg" block disabled={true}>
            Install / Upgrade chaincode
          </LoadingButton>
        </Col>
      </Row>
    );
  }
}

export default Home;

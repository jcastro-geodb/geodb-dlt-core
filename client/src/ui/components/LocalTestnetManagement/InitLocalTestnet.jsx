import React from "react";
import LoadingButton from "../LoadingButton";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import initLocalTestnet from "../../../helpers/initLocalTestnet";
import { NotificationManager } from "react-notifications";

class InitLocalTestnet extends React.Component {
  state = {
    loading: false,
    loadingMsg: ""
  };

  handleInitLocalTestnet = () => {
    const { db } = this.props;
    this.setState({ loading: true });

    initLocalTestnet(db)
      .on("stdout", data => console.log(`${data}`))
      .on("stderr", data => console.error(`${data}`))
      .run()
      .then(() => {
        NotificationManager.success("Command ran successfully");
      })
      .catch(error => {
        console.error(error);
        NotificationManager.error("An error occurred. Check the logs");
      })
      .finally(() => {
        this.setState({ loading: false });
        console.log(typeof this.props.callBack);
        if (this.props.callBack) this.props.callBack();
      });
  };

  render() {
    const { loading } = this.state;

    return (
      <div>
        <LoadingButton size="lg" block onClick={this.handleInitLocalTestnet} loading={loading}>
          Init local testnet
        </LoadingButton>
        <Modal show={loading} size="lg" aria-labelledby="contained-modal-title-vcenter" centered backdrop="static">
          <Modal.Body>
            <div className="text-center">
              <p>Initializing network</p>
              <p>
                <small>{this.state.loadingMsg}</small>
              </p>
              <Spinner animation="grow" variant="primary" />
              <Spinner animation="grow" variant="success" />
              <Spinner animation="grow" variant="danger" />
              <Spinner animation="grow" variant="warning" />
              <Spinner animation="grow" variant="info" />
            </div>
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}

export default InitLocalTestnet;

import React from "react";
import LoadingButton from "../LoadingButton";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import runBashScript from "../../../helpers/runBashScript";
import { NotificationManager } from "react-notifications";

export default class Down extends React.Component {
  state = {
    loading: false,
    loadingMsg: ""
  };

  handleUp = () => {
    const { composerPath, checkContainersStatus } = this.props;

    this.setState({ loading: true });

    runBashScript({ command: `docker-down.sh`, args: [composerPath] })
      .on("updateProgress", loadingMsg => this.setState({ loadingMsg }))
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
        checkContainersStatus();
        this.setState({ loading: false });
      });
  };

  disabled = () => {
    return this.props.containers.length === 0;
  };

  render() {
    const { loading } = this.state;

    return (
      <span>
        <LoadingButton
          className="m-1"
          variant="dark"
          onClick={this.handleUp}
          loading={loading}
          disabled={this.disabled()}
        >
          <i className="fas fa-stop" /> Down
        </LoadingButton>
        <Modal show={loading} size="lg" aria-labelledby="contained-modal-title-vcenter" centered backdrop="static">
          <Modal.Body>
            <div className="text-center">
              <p>Running command</p>
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
      </span>
    );
  }
}

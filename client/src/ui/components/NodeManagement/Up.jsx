import React from "react";
import LoadingButton from "../LoadingButton";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";
import checkOrganizationContainers from "../../../helpers/checkOrganizationContainers";
import runBashScript from "../../../helpers/runBashScript";
import { NotificationManager } from "react-notifications";

class ResetLocalTestnet extends React.Component {
  state = {
    loading: false,
    disabled: false,
    composerPath: null,
    loadingMsg: ""
  };

  handleUp = () => {
    const { db, mode } = this.props;
    const { composerPath } = this.state;

    this.setState({ loading: true });

    runBashScript({ command: `start.sh`, args: [composerPath] })
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
        this.checkContainersRunning();
        this.setState({ loading: false });
      });

    // runBashScript(`docker-compose -f ${organization.composerPath}`)
    //   .on("stdout", data => console.log(`${data}`))
    //   .on("stderr", data => console.error(`${data}`))
    //   .run()
    //   .then(() => {
    // NotificationManager.success("Command ran successfully");
    //   })
    //   .catch(error => {
    //     console.error(error);
    //     NotificationManager.error("An error occurred. Check the logs");
    //   })
    //   .finally(() => {
    //     this.setState({ loading: false });
    //   });
  };

  buildCommand = () => {};

  checkContainersRunning = () => {
    const { db, mode, organization } = this.props;
    this.setState({ disabled: false });

    db[mode]
      .findOne({ _id: organization })
      .then(result => {
        if (result && result.composerPath) {
          this.setState({ composerPath: result.composerPath });
          return checkOrganizationContainers({ organization })
            .on("stderr", data => console.error(`${data}`))
            .run();
        } else throw new Error("Could not find composer path");
      })
      .then(result => {
        for (let i = 0; i < result.length; i++) {
          let container = result[i].split(":");
          container = {
            _id: container && container.length > 0 ? container[0] : "unknown",
            status: container && container.length > 1 ? container[1] : "unknown"
          };

          if (
            container.status &&
            typeof container.status === "string" &&
            container.status.toLowerCase().includes("up")
          ) {
            this.setState({ disabled: true });
            break;
          }
        }
      })
      .catch(error => console.error(error));
  };

  componentDidMount() {
    this.checkContainersRunning();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.organization !== prevProps.organization) this.checkContainersRunning();
  }

  render() {
    const { loading, disabled } = this.state;
    const { organization } = this.props;

    return (
      <span>
        <LoadingButton onClick={this.handleUp} loading={loading} disabled={disabled}>
          <i className="fas fa-play" /> Up
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

export default ResetLocalTestnet;

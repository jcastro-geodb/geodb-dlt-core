import React from "react";
import Button from "react-bootstrap/Button";
// import fs from "fs-extra";
import path from "path";

import { NotificationManager } from "react-notifications";

import Loading from "../components/Loading.jsx";
import SetupOrgModal from "../components/SetupOrgModal.jsx";

const errors = {
  noCertificatePathFound: "No certificate path found"
};

class Federation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      db: props.db,
      loadingUserConfig: true,
      showSetupOrgModal: false
    };
  }

  checkCertificates = () => {
    const { db } = this.state;

    db.find({ _id: "msp-path" })
      .then(result => {
        if (result.length === 0) {
          throw errors.noCertificatePathFound;
          // => Trigger CA setup
        }

        const mspPath = result[0];

        path.resolve(__dirname, mspPath);
      })
      .then()
      .catch(err => {
        switch (err) {
          case errors.noCertificatePathFound:
            this.setState({ showSetupOrgModal: true });
            break;
          default:
            NotificationManager.error(`${err}`, "Failed to run command");
            console.error(err);
        }
      })
      .finally(() => {
        this.setState({ loadingUserConfig: false });
      });
  };

  closeSetupOrgModal = () => {
    this.setState({ showSetupOrgModal: false });
  };

  componentDidMount() {
    this.checkCertificates();
  }

  render() {
    const { loadingUserConfig, showSetupOrgModal } = this.state;

    if (loadingUserConfig) return <Loading />;

    return (
      <div>
        <Button onClick={this.insert}>Insert</Button>
        <Button onClick={this.log}>Log</Button>
        <SetupOrgModal show={showSetupOrgModal} onHide={this.closeSetupOrgModal} />
      </div>
    );
  }
}
export default Federation;

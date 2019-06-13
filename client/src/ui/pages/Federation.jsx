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
        console.log(mspPath);

        // console.log(path.resolve(process.cwd(), mspPath));
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

  closeSetupOrgModal = success => {
    this.setState({ showSetupOrgModal: false });

    if (success) this.checkCertificates();
  };

  delete = () => {
    const { db } = this.state;

    db.remove({ _id: "msp-path" })
      .then(result => {
        console.log("Success");
      })
      .catch(error => console.log);
  };

  componentDidMount() {
    this.checkCertificates();
  }

  render() {
    const { db, loadingUserConfig, showSetupOrgModal } = this.state;

    if (loadingUserConfig) return <Loading />;

    return (
      <div>
        <Button onClick={this.delete}>Delete</Button>
        <Button onClick={this.log}>Log</Button>
        <SetupOrgModal show={showSetupOrgModal} onHide={this.closeSetupOrgModal} db={db} />
      </div>
    );
  }
}
export default Federation;

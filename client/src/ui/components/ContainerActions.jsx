import React from "react";
import checkOrganizationContainers from "../../helpers/checkOrganizationContainers";
import Up from "./NodeManagement/Up";
import Down from "./NodeManagement/Down";
// import Stop from "./NodeManagement/Stop";

class ContainerActions extends React.Component {
  state = {
    composerPath: null,
    containers: []
  };

  checkContainersStatus = () => {
    const { db, mode, organization } = this.props;

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
      .then(containers => {
        this.setState({ containers });
      })
      .catch(error => console.error(error));
  };

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.organization !== prevProps.organization) this.checkContainersStatus();
  }

  render() {
    if (this.props.organization === false) return null;

    // <Stop {...this.props} {...this.state}/>

    return (
      <div>
        <Up {...this.props} {...this.state} checkContainersStatus={this.checkContainersStatus} />
        <Down {...this.props} {...this.state} checkContainersStatus={this.checkContainersStatus} />
      </div>
    );
  }
}

export default ContainerActions;

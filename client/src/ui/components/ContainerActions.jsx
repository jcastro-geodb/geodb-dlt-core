import React from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Up from "./NodeManagement/Up";

class ContainerActions extends React.Component {
  render() {
    if (this.props.organization === false) return null;

    return (
      <div>
        <Up {...this.props} />
        <Button className="m-1">Start</Button>
        <Button className="m-1">Start</Button>
      </div>
    );
  }
}

export default ContainerActions;

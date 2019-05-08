import React from "react";
import Badge from "react-bootstrap/Badge";

const ContainerStatus = props => (
  <div className="d-flex justify-content-between">
    {props.name}
    {props.running ? (
      <Badge variant="success">Running</Badge>
    ) : (
      <Badge variant="danger">Stopped</Badge>
    )}
  </div>
);

export default ContainerStatus;

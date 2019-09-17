import React from "react";
import Jumbotron from "react-bootstrap/Jumbotron";
import Alert from "react-bootstrap/Alert";

export default props => (
  <Jumbotron>
    <h1>A nasty error happened</h1>
    <p>There is something very wrong here and we cannot go on. Please report this.</p>

    <Alert variant={"danger"}>
      <p>
        <b>Log: </b>
      </p>
      {props.error}
    </Alert>
  </Jumbotron>
);

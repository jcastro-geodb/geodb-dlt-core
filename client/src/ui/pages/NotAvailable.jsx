import React from "react";

import Alert from "react-bootstrap/Alert";

class NotAvailable extends React.PureComponent {
  render() {
    return (
      <Alert variant={"danger"}>
        <h1>Woops</h1>
        <b>This feature is not available yet</b>
      </Alert>
    );
  }
}

export default NotAvailable;

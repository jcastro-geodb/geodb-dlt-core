import React from "react";
import X509Data from "./X509Data.jsx";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";

import AuthorizeNewMember from "./AuthorizeNewMember";

class FederationDashboard extends React.Component {
  constructor() {
    super();
    this.state = { events: [] };
    this.intervalId = undefined;
  }

  componentDidMount() {
    this.fetchEvents();
    this.intervalId = setInterval(() => {
      this.fetchEvents();
    }, 5000);
  }

  componentWillUnmount() {
    clearInterval(this.intervalId);
  }

  fetchEvents = () => {
    const { db, mode, organization } = this.props;

    db.events
      .find({
        mode
      })
      .sort({ timestamp: 1 })
      .then(events => {
        this.setState({ events });
      })
      .catch(error => {
        console.error(error);
      });
  };

  renderLocalTestnetBaseOrg = () => {
    const { organization, mode, db } = this.props;
    const { events } = this.state;

    return (
      <Row>
        <Col>
          <h4>Events requiring action</h4>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Type</th>
                <th>Organization</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(_event => {
                if (_event.approvedBy.includes(organization.domain) === true || _event.resolved === true) return null;

                return (
                  <tr key={_event._id}>
                    <td>{_event.type ? _event.type : "Unknown"}</td>
                    <td>{_event.values && _event.values.domain ? _event.values.domain : "Unknown"}</td>
                    <td>
                      <AuthorizeNewMember
                        organization={organization}
                        db={db}
                        mode={mode}
                        _event={_event}
                        cli="clipeer0.operations.geodb.com"
                        orderer="orderer0.operations.geodb.com:7050"
                        channel="rewards"
                      />
                      <br />
                      <Button
                        block
                        variant="danger"
                        onClick={() => {
                          db.events.remove({ _id: _event._id });
                        }}
                      >
                        <i className="fa fa-trash" aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 ? (
                <tr>
                  <td>No events to show</td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </Col>
        <Col>
          <h4>Actions</h4>
        </Col>
      </Row>
    );
  };

  render() {
    const { organization, mode, db } = this.props;

    if (organization && organization.domain === "operations.geodb.com" && mode === "local")
      // Render the dashboard for the base local testnet
      return this.renderLocalTestnetBaseOrg();

    return (
      <div>
        Organization dashboard <hr /> <X509Data organization={organization} />
      </div>
    );
  }
}

export default FederationDashboard;

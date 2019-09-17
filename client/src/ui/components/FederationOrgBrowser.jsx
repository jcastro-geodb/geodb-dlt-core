import React from "react";
import Nav from "react-bootstrap/Nav";
import Button from "react-bootstrap/Button";
import Fade from "react-bootstrap/Fade";

class FederationOrgBrowser extends React.Component {
  state = {
    showRemoveButton: ""
  };

  handleShowRemoveOrg = organization => {
    this.setState({ showRemoveButton: organization.domain });
  };

  handleHideRemoveOrg = organization => {
    if (organization.domain === this.state.showRemoveButton);
    this.setState({ showRemoveButton: "" });
  };

  render() {
    const { mode, organizations, handleAddOrg, handleRemoveOrg, handleShowOrg } = this.props;
    const { showRemoveButton } = this.state;

    return (
      <Nav variant="tabs" defaultActiveKey={organizations.length > 0 ? organizations[0].domain : null}>
        <Nav.Item>
          <Nav.Link href="#" onClick={handleAddOrg}>
            <i className="fas fa-plus-square" /> Add
          </Nav.Link>
        </Nav.Item>

        {organizations.map(organization => {
          return (
            <Nav.Item
              key={organization.domain}
              onClick={() => handleShowOrg(organization)}
              onMouseEnter={() => {
                this.handleShowRemoveOrg(organization);
              }}
              onMouseLeave={() => {
                this.handleHideRemoveOrg(organization);
              }}
            >
              <Nav.Link eventKey={organization.domain}>
                <span>{organization.domain}</span>{" "}
                <Fade in={showRemoveButton === organization.domain}>
                  <Button size="sm" variant="link" onClick={() => handleRemoveOrg(organization._id)}>
                    <i className="far fa-trash-alt" />
                  </Button>
                </Fade>
              </Nav.Link>
            </Nav.Item>
          );
        })}
      </Nav>
    );
  }
}

export default FederationOrgBrowser;

import React from "react";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";

import ContainerList from "./ContainerList";
import ContainerActions from "./ContainerActions";

class ContainerManager extends React.Component {
  state = {
    loading: true,
    organizations: [],
    selectedOrganization: false
  };

  fetchOrganizations = () => {
    const { db, mode } = this.props;

    db[mode]
      .find()
      .then(results => {
        let organizations = [];
        for (let i = 0; i < results.length; i++) {
          organizations.push(results[i]._id);
        }
        this.setState({ organizations, selectedOrganization: organizations.length > 0 ? organizations[0] : false });
      })
      .catch(error => {
        console.error(error);
      })
      .finally(() => {
        this.setState({ loading: false });
      });
  };

  handleSelectOrganization = e => {
    this.setState({ selectedOrganization: e.target.value });
  };

  componentDidMount() {
    this.fetchOrganizations();
  }

  render() {
    const { db, mode } = this.props;
    const { loading, organizations, selectedOrganization } = this.state;

    return (
      <Card border="primary" className="shadow-lg p-3 mb-5">
        <Card.Header bg="primary">
          <div className="d-flex justify-content-between">
            <h4>Containers</h4>
            <Form>
              <Form.Control
                size="lg"
                as="select"
                disabled={loading}
                value={selectedOrganization}
                onChange={this.handleSelectOrganization}
              >
                {loading === true ? <option value={false}>Fetching organizations...</option> : null}
                {loading === false && organizations.length === 0 ? (
                  <option value={false}>No organizations found</option>
                ) : null}
                {loading === false
                  ? organizations.map(organization => {
                      return (
                        <option value={organization} key={organization}>
                          {organization}
                        </option>
                      );
                    })
                  : null}
              </Form.Control>
            </Form>
          </div>
        </Card.Header>
        <Card.Body>
          <ContainerActions {...this.props} organization={selectedOrganization} />
          <ContainerList {...this.props} organization={selectedOrganization} />
        </Card.Body>
      </Card>
    );
  }
}

export default ContainerManager;

import React from "react";
import ContainerListItem from "./ContainerListItem";
import ListGroup from "react-bootstrap/ListGroup";
import { namesFromDatabaseEntry } from "../../helpers/extractServicesFromComposer";

class ContainerList extends React.Component {
  state = {
    loading: false,
    containers: []
  };

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.organization !== this.props.organization) {
      this.setState({ loading: true });
      const { db, mode, organization } = this.props;

      db[mode]
        .findOne({ _id: organization })
        .then(result => {
          if (result) {
            return namesFromDatabaseEntry(result);
          } else {
            throw new Error("Could not find the YAML configuration file for the nodes");
          }
        })
        .then(containers => {
          this.setState({ containers });
        })
        .catch(error => {
          console.error(error);
        })
        .finally(() => {
          this.setState({ loading: false });
        });
    }
  }

  render() {
    const { organization } = this.props;
    const { loading, containers } = this.state;

    if (loading === true) return "Reading containers...";

    if (organization === false) return null;

    if (!containers || containers.length === 0) return "No containers found";

    return (
      <ListGroup variant="flush">
        {containers.map(container => {
          return (
            <ListGroup.Item key={container}>
              <ContainerListItem container={container} />
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    );
  }
}

export default ContainerList;

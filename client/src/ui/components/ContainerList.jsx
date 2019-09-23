import React from "react";
import ContainerListItem from "./ContainerListItem";
import ListGroup from "react-bootstrap/ListGroup";
import fs from "fs-extra";
const yaml = require("js-yaml");
const path = require("path");

class ContainerList extends React.Component {
  state = {
    loading: false,
    containers: []
  };

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.organization != this.props.organization) {
      this.setState({ loading: true });
      const { db, mode, organization } = this.props;

      db[mode]
        .findOne({ _id: organization })
        .then(result => {
          if (result && result.composerPath) {
            const { composerPath } = result;
            return fs.readFile(path.resolve(composerPath), "utf8");
          } else {
            throw new Error("Could not find the YAML configuration file for the nodes");
          }
        })
        .then(rawYaml => {
          const composerInJSON = yaml.safeLoad(rawYaml);
          if (composerInJSON && composerInJSON.services && Object.keys(composerInJSON).length > 0) {
            const containers = Object.keys(composerInJSON.services);
            this.setState({ containers });
          } else {
            throw new Error("Could not find any defined services for the provided YAML config file");
          }
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

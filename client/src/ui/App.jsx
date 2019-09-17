import React from "react";

/*
 =============== BOOTSTRAP
*/
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

/*
 =============== NAVIGATION
*/

import Menu from "./components/Menu.jsx";
import Loading from "./components/Loading.jsx";
import Router from "./components/Router.jsx";
import Error from "./components/Error.jsx";
import SetupNetwork from "./components/SetupNetwork.jsx";

import Breadcrumbs from "@trendmicro/react-breadcrumbs";
import ensureArray from "ensure-array";
import styled from "styled-components";

import "@trendmicro/react-sidenav/dist/react-sidenav.css";
import "@trendmicro/react-breadcrumbs/dist/react-breadcrumbs.css";

import routes from "./routes/routes.jsx";
import { withRouter } from "react-router-dom";

import "react-notifications/lib/notifications.css";
import { NotificationContainer } from "react-notifications";

/*
 =============== HELPERS (CHECKERS)
*/

import { checkNetwork, NO_MODE_SPECIFIED, NETWORK_RUNNING, NETWORK_NOT_RUNNING } from "../helpers/checkNetwork.jsx";
import checkNetworkConfig from "../helpers/checkNetworkConfig.jsx";
import checkCryptoConfig from "../helpers/checkCryptoConfig.jsx";
import Database from "../database/Database.jsx";

/*
 =============== DATABASE
*/

const Datastore = require("nedb-promises");

/*
 =============== APP RENDER
*/

const Layout = styled.main`
  position: relative;
  overflow: hidden;
  transition: all 0.15s;
  padding: 0 20px;
  margin-left: ${props => (props.expanded ? 240 : 64)}px;
`;

class App extends React.PureComponent {
  state = {
    selected: "home",
    expanded: false,
    mode: "",
    setupNeeded: false,
    loading: true,
    loadingMsg: "",
    error: false,
    db: null
  };

  onSelect = selected => {
    this.setState({ selected: selected });

    let route = this.searchRoute(selected);

    this.props.history.push(route.path);
  };

  onToggle = expanded => {
    this.setState({ expanded: expanded });
  };

  handleChangeMode = e => {
    this.setState({ mode: e.target.value });
    this.state.db.preferences
      .update({ _id: "mode" }, { _id: "mode", value: e.target.value }, { upsert: true })
      .then(result => {
        this.runChecks();
      });
  };

  handleSetupFinished = skip => {
    if (skip === true) {
      this.setState({ loading: false, setupNeeded: false });
      return;
    }

    this.runChecks();
  };

  runChecks = () => {
    this.setState({ loading: true });
    let { mode, db } = this.state;

    let checks = new Promise((resolve, reject) => {
      db.preferences
        .find({ _id: "mode" }) // Search last mode selected
        .then(result => {
          if (result && result.length > 0 && result[0].value) {
            mode = result[0].value;
            if (mode === "gcp") resolve({ mode, setupNeeded: false });
            this.setState({ loadingMsg: "Checking network" });
          } else {
            resolve({ mode, setupNeeded: "first" });
          }

          return checkNetwork(mode);
        })
        .then(result => {
          if (mode === "local") {
            switch (result) {
              case NETWORK_RUNNING:
                resolve({ mode, setupNeeded: false });
                break;
              case NETWORK_NOT_RUNNING:
                resolve({ mode, setupNeeded: "initNetwork" });
                break;
              default:
                resolve({ mode });
                break;
            }
          } else if (mode === "gcp") {
            throw new Error("The software followed a route not available yet.");
          } else {
            throw new Error("Could not determine selected mode for the network. Database corrupted?");
          }
        })
        .catch(error => {
          reject(error);
        });
    });

    checks
      .then(result => {
        this.setState(result);
      })
      .catch(error => {
        console.error(error);
        this.setState({ error });
      })
      .finally(() => {
        this.setState({ loading: false });
      });
  };

  searchRoute(key) {
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].key === key) return routes[i];
    }

    return null;
  }

  renderBreadcrumbs() {
    const { selected } = this.state;

    let route = this.searchRoute(selected);

    if (route === null) return <div>Error</div>;

    const list = ensureArray(route.breadcrumb);

    return (
      <Breadcrumbs>
        {list.map((item, index) => (
          <Breadcrumbs.Item active={index === list.length - 1} key={`${selected}_${index}`}>
            {item}
          </Breadcrumbs.Item>
        ))}
      </Breadcrumbs>
    );
  }

  componentDidMount() {
    this.onSelect("federation"); // Default selected item for the lateral menu
    Database.getInstance()
      .then(db => {
        this.setState({ db });
        this.runChecks();
      })
      .catch(error => {
        console.error(error);
        this.setState({ error });
      });
    // this.runChecks();
  }

  render() {
    const { db, expanded, selected, loading, loadingMsg, error, mode, setupNeeded } = this.state;

    if (setupNeeded) {
      return (
        <SetupNetwork db={db} setupNeeded={setupNeeded} mode={mode} handleSetupFinished={this.handleSetupFinished} />
      );
    }

    return (
      <Container fluid>
        <Menu
          onSelect={this.onSelect}
          onToggle={this.onToggle}
          selected={selected}
          expanded={expanded}
          routes={routes}
        />
        <Layout expanded={expanded}>
          <Row>
            <Col sm={{ span: 2 }}>{this.renderBreadcrumbs()}</Col>
            <Col sm={{ span: 2, offset: 8 }}>
              <Form.Label>Testnet mode</Form.Label>
              <Form.Control as="select" onChange={this.handleChangeMode} value={mode} disabled={loading}>
                <option value="local">Local testnet</option>
                <option value="gcp">GCP testnet</option>
              </Form.Control>
            </Col>
          </Row>
          <hr />
          {error ? (
            <Error error={error} />
          ) : loading ? (
            <Loading loadingMsg={loadingMsg} />
          ) : (
            <Router mode={mode} db={db} />
          )}
        </Layout>
        <NotificationContainer />
      </Container>
    );
  }
}

export default withRouter(App);

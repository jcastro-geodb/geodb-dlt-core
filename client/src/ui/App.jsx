import React from "react";
import { Switch, Route } from "react-router-dom";

/*
 =============== BOOTSTRAP
*/
import Container from "react-bootstrap/Container";
/*
 =============== NAVIGATION
*/

import Menu from "./components/Menu.jsx";
import Loading from "./components/Loading.jsx";

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
 =============== DATABASE
*/

const Datastore = require("nedb");

/*
 =============== APP RENDER
*/

const Main = styled.main`
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
    loading: true,
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
          <Breadcrumbs.Item
            active={index === list.length - 1}
            key={`${selected}_${index}`}
          >
            {item}
          </Breadcrumbs.Item>
        ))}
      </Breadcrumbs>
    );
  }

  renderRouter() {
    const props = { db: this.state.db };

    return (
      <Switch>
        {routes.map(prop => {
          if (prop.exact)
            return (
              <Route
                exact
                path={prop.path}
                render={() => React.createElement(prop.page, props)}
                key={prop.key}
              />
            );
          else
            return (
              <Route
                path={prop.path}
                render={() => React.createElement(prop.page, props)}
                key={prop.key}
              />
            );
        })}
      </Switch>
    );
  }

  componentDidMount() {
    this.onSelect("federation");
    const db = new Datastore({ filename: "~/geodb-store" });
    db.loadDatabase(err => {
      this.setState({ loading: false, db });
    });
  }

  render() {
    const { expanded, selected, loading } = this.state;

    if (loading) {
      return <Loading />;
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
        <Main expanded={expanded}>
          <div className="text-right">Fabric status: --</div>
          <div>{this.renderBreadcrumbs()}</div>
          <Container fluid>{this.renderRouter()}</Container>
        </Main>
        <NotificationContainer />
      </Container>
    );
  }
}

export default withRouter(App);

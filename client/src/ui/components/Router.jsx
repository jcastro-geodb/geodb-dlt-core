import React from "react";
import { Switch, Route } from "react-router-dom";
import routes from "../routes/routes.jsx";
import Container from "react-bootstrap/Container";
import NotAvailable from "../pages/NotAvailable.jsx";

export default props => {
  if (props.mode === "gcp") {
    return <NotAvailable />;
  }

  return (
    <Container fluid>
      <Switch>
        {routes.map(prop => {
          if (prop.exact)
            return <Route exact path={prop.path} render={() => React.createElement(prop.page, props)} key={prop.key} />;
          else return <Route path={prop.path} render={() => React.createElement(prop.page, props)} key={prop.key} />;
        })}
      </Switch>
    </Container>
  );
};

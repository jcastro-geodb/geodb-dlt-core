import React from "react";

import { Button, ButtonGroup } from "@trendmicro/react-buttons";
import Dropdown, { MenuItem } from "@trendmicro/react-dropdown";
import ensureArray from "ensure-array";
import styled from "styled-components";

import SideNav, {
  Toggle,
  Nav,
  NavItem,
  NavIcon,
  NavText
} from "@trendmicro/react-sidenav";

import "@trendmicro/react-sidenav/dist/react-sidenav.css";

class Menu extends React.PureComponent {
  render() {
    const { onSelect, onToggle, selected, expanded, routes } = this.props;

    return (
      <SideNav onSelect={onSelect} onToggle={onToggle}>
        <SideNav.Toggle />
        <SideNav.Nav selected={selected}>
          {routes.map(prop => {
            return (
              <NavItem key={prop.key} eventKey={prop.key}>
                <NavIcon>
                  <i
                    className={prop.icon}
                    style={{ fontSize: "1.75em", verticalAlign: "middle" }}
                  />
                </NavIcon>
                <NavText style={{ paddingRight: 32 }} title={prop.title}>
                  {prop.title}
                </NavText>
              </NavItem>
            );
          })}
        </SideNav.Nav>
      </SideNav>
    );
  }
}

// <NavItem eventKey="home">
//   <NavIcon>
//     <i
//       className="fa fa-fw fa-home"
//       style={{ fontSize: "1.75em", verticalAlign: "middle" }}
//     />
//   </NavIcon>
//   <NavText style={{ paddingRight: 32 }} title="Home">
//     Home
//   </NavText>
// </NavItem>
// <NavItem eventKey="federation">
//   <NavIcon>
//     <i
//       className="fa fa-fw fa-university"
//       style={{ fontSize: "1.75em", verticalAlign: "middle" }}
//     />
//   </NavIcon>
//   <NavText style={{ paddingRight: 32 }} title="Home">
//     Federation
//   </NavText>
// </NavItem>
// <NavItem eventKey="settings">
//   <NavIcon>
//     <i
//       className="fa fa-fw fa-cogs"
//       style={{ fontSize: "1.5em", verticalAlign: "middle" }}
//     />
//   </NavIcon>
//   <NavText style={{ paddingRight: 32 }} title="Settings">
//     Settings
//   </NavText>
//   <NavItem eventKey="settings/policies">
//     <NavText title="Policies">Policies</NavText>
//   </NavItem>
//   <NavItem eventKey="settings/network">
//     <NavText title="Network">Network</NavText>
//   </NavItem>
// </NavItem>
export default Menu;

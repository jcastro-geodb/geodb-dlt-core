import Home from "../pages/Home.jsx";
import Federation from "../pages/Federation.jsx";
import FabricSettings from "../pages/FabricSettings.jsx";
import EthereumSettings from "../pages/EthereumSettings.jsx";

const routes = [
  {
    key: "home",
    title: "Home",
    page: Home,
    exact: true,
    path: "/",
    icon: "fa fa-fw fa-home",
    breadcrumb: "Home"
  },
  {
    key: "federation",
    title: "Federation",
    page: Federation,
    exact: false,
    path: "/federation",
    icon: "fa fa-fw fa-university",
    breadcrumb: "Federation"
  },
  {
    key: "ethereum",
    title: "Ethereum Settings",
    page: EthereumSettings,
    exact: false,
    path: "/ethereum",
    icon: "fab fa-ethereum",
    breadcrumb: "Ethereum"
  },
  {
    key: "fabric",
    title: "Fabric Settings",
    page: FabricSettings,
    exact: false,
    path: "/fabric",
    icon: "fas fa-link",
    breadcrumb: "Fabric"
  }
];

// pageTitle = {
//   home: "Home",
//   federation: "Federation",
//   "settings/policies": ["Settings", "Policies"],
//   "settings/network": ["Settings", "Network"]
// };
export default routes;

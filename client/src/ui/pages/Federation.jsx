import React from "react";
import fs from "fs-extra";
import path from "path";

class Federation extends React.Component {
  state = {
    loadingUserConfig: false
  };

  componentDidMount() {
    console.log(__filename);
    console.log(__dirname);
    console.log(path.resolve(__dirname, "index.js"));
    // const ca-config = path.resolve(__dirname, "");
  }

  render() {
    return <div>TODO Federation Info</div>;
  }
}
export default Federation;

import React from "react";
import Skeleton from "react-loading-skeleton";

class Loading extends React.PureComponent {
  render() {
    return <Skeleton count={5} />;
  }
}

export default Loading;

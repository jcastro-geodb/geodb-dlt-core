import React from "react";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";

const LoadingButton = props => {
  const { children, loading, ...rest } = props;
  return (
    <Button {...rest} disabled={loading === true}>
      {loading !== true && children}

      <span>
        {loading && (
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
          />
        )}
      </span>
    </Button>
  );
};

export default LoadingButton;

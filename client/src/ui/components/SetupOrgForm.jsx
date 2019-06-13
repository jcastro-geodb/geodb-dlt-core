import React from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import { Formik } from "formik";
import * as Yup from "yup";
import fs from "fs-extra";
import path from "path";

import LoadingButton from "./LoadingButton.jsx";

class SetupOrgForm extends React.Component {
  state = {
    showOverwrite: false
  };

  checkOverwrite = e => {
    const showOverwrite = fs.pathExistsSync(
      path.resolve(process.cwd(), `./../network/crypto-config/${e.target.value}`)
    );
    if (showOverwrite !== this.state.showOverwrite) this.setState({ showOverwrite });
  };

  render() {
    const { handleCancel, startSetup } = this.props;
    const { showOverwrite } = this.state;

    return (
      <Formik
        initialValues={{ domain: "" }}
        onSubmit={values => {
          startSetup({ domain: values.domain, overwrite: showOverwrite });
        }}
        validationSchema={Yup.object().shape({
          domain: Yup.string()
            .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/, "Invalid domain name")
            .required("Required")
        })}
      >
        {props => {
          const { values, errors, handleChange, handleSubmit } = props;
          return (
            <Form onSubmit={handleSubmit}>
              <Form.Row>
                <Form.Group as={Col} md="8">
                  <Form.Label>Organization name (e.g. geodb.com)</Form.Label>
                  <Form.Control
                    type="text"
                    name="domain"
                    onChange={e => {
                      handleChange(e);
                      this.checkOverwrite(e);
                    }}
                    isValid={values.domain && !errors.domain}
                    isInvalid={!!errors.domain}
                  />
                  <Form.Control.Feedback type="invalid">{errors.domain}</Form.Control.Feedback>
                  <Form.Control.Feedback type="valid">OK!</Form.Control.Feedback>
                </Form.Group>
              </Form.Row>

              {showOverwrite === true && (
                <Form.Row>
                  <Form.Check
                    required
                    name="overwrite"
                    label="Overwrite current organization"
                    onChange={handleChange}
                  />
                </Form.Row>
              )}

              <br />

              <Row>
                <Col xs={6}>
                  <LoadingButton block type="submit">
                    Start setup
                  </LoadingButton>
                </Col>
                <Col xs={6}>
                  <Button
                    block
                    variant="outline-danger"
                    onClick={() => {
                      handleCancel(false);
                    }}
                  >
                    Cancel
                  </Button>
                </Col>
              </Row>
            </Form>
          );
        }}
      </Formik>
    );
  }
}

export default SetupOrgForm;

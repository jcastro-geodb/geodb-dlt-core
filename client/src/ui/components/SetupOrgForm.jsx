import React from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import { Formik } from "formik";
import * as Yup from "yup";

import LoadingButton from "./LoadingButton.jsx";

const SetupOrgForm = props => {
  const { handleCancel } = props;

  return (
    <Formik
      initialValues={{ domain: "" }}
      onSubmit={(values, { setSubmitting }) => {
        setTimeout(() => {
          alert(JSON.stringify(values, null, 2));
          setSubmitting(false);
        }, 500);
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
                  onChange={handleChange}
                  isValid={values.domain && !errors.domain}
                  isInvalid={!!errors.domain}
                />
                <Form.Control.Feedback type="invalid">{errors.domain}</Form.Control.Feedback>
                <Form.Control.Feedback type="valid">OK!</Form.Control.Feedback>
              </Form.Group>
            </Form.Row>

            <Row>
              <Col xs={6}>
                <LoadingButton block type="submit">
                  Start setup
                </LoadingButton>
              </Col>
              <Col xs={6}>
                <Button block variant="outline-danger" onClick={handleCancel}>
                  Cancel
                </Button>
              </Col>
            </Row>
          </Form>
        );
      }}
    </Formik>
  );
};

export default SetupOrgForm;

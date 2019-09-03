package main

const STATUS_VALID = "valid"
const STATUS_REVOKED = "revoked"
const STATUS_APPROVING = "approving"

type schema struct {
	mspId  string
	status string
}

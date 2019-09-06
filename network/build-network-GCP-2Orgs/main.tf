//Set Up Provider
variable credential {}
provider "google" {
 credentials = "${file("${var.credential}")}"
 project     = "dlt-testing-245512"
 region      = "us-west1"
}

// Terraform plugin for creating random ids
resource "random_id" "instance_id" {
 byte_length = 8
}

// A single Google Cloud Engine instance
resource "google_compute_instance" "ca-root" {
 name         = "ca-root-${random_id.instance_id.hex}"
 machine_type = "n1-standard-1"
 zone         = "us-central1-c"

 boot_disk {
   initialize_params {
     image = "ca-root-image"
   }
 }

 labels = {
    hl-f = "ca-root"
  }

 // Execute server
 metadata_startup_script = "${file("./scripts/setup.sh")}"
 
 network_interface {
   network = "hl-network-dev"

   access_config {
     // Include this section to give the VM an external ip address
   }
 }

}

export const TYPE_CLI = "cli";
export const TYPE_ORDERER = "orderer";
export const TYPE_PEER = "peer";
export const TYPE_UNKNOWN = "unknown";

export const getServiceTypeFromJSON = dockerServiceInJSON => {
  if (dockerServiceInJSON && dockerServiceInJSON.extends && dockerServiceInJSON.extends.service) {
    return dockerServiceInJSON.extends.service;
  } else if (
    dockerServiceInJSON &&
    dockerServiceInJSON.container_name &&
    typeof dockerServiceInJSON.container_name === "string"
  ) {
    const containerName = dockerServiceInJSON.container_name;
    return containerName.includes("cli")
      ? TYPE_CLI
      : containerName.includes("orderer")
      ? TYPE_ORDERER
      : containerName.includes("peer")
      ? TYPE_PEER
      : TYPE_UNKNOWN;
  } else {
    return TYPE_UNKNOWN;
  }
};

export const findTypeFromJSON = (dockerServicesInJSON, type) => {
  if ([TYPE_CLI, TYPE_ORDERER, TYPE_PEER].includes(type) === false) {
    throw new Error(`Incorrect service type ${type}`);
  }

  for (let i = 0; i < dockerServicesInJSON.length; i++) {
    const service = dockerServicesInJSON[i];

    if (getServiceTypeFromJSON(service) === type) {
      return service;
    }
  }

  return;
};

export const findTypeFromJSONString = (dockerServicesJSONString, type) => {
  const dockerServicesInJSON = JSON.parse(dockerServicesJSONString);
  return findTypeFromJSON(dockerServicesInJSON);
};

import fs from "fs-extra";
const yaml = require("js-yaml");
const path = require("path");

export const namesFromJSON = composerInJSON => {
  if (composerInJSON && composerInJSON.services && Object.keys(composerInJSON).length > 0)
    return Object.keys(composerInJSON.services);

  return [];
};

export const namesFromJSONString = str => {
  const jsonObject = JSON.parse(str);

  return namesFromJSON(jsonObject);
};

export const namesFromYAMLFile = filePath => {
  let services = [];

  return fs
    .readFile(path.resolve(filePath))
    .then(rawYaml => {
      return namesFromJSON(yaml.safeLoad(rawYaml));
    })
    .catch(error => {
      console.error(error);
    });
};

export const namesFromDatabaseEntry = entry => {
  return new Promise((resolve, reject) => {
    if (entry && entry.composerJSON) {
      resolve(namesFromJSONString(entry.composerJSON));
    } else if (entry && entry.composerPath) {
      resolve(namesFromYAMLFile(entry.composerPath));
    } else {
      reject("Could not find the YAML configuration file for the nodes");
    }
  });
};

export const dataFromJSON = composerInJSON => {
  let services = [];
  if (composerInJSON && composerInJSON.services && Object.keys(composerInJSON).length > 0) {
    const servicesInsideComposerFile = Object.keys(composerInJSON.services);
    for (let service of servicesInsideComposerFile) {
      services.push(composerInJSON.services[service]);
    }
  }

  return services;
};

export const dataFromJSONString = str => {
  const jsonObject = JSON.parse(str);
  return dataFromJSON(jsonObject);
};

export const dataFromYAMLFile = filePath => {
  let services = [];

  return fs
    .readFile(path.resolve(filePath))
    .then(rawYaml => {
      return dataFromJSON(yaml.safeLoad(rawYaml));
    })
    .catch(error => {
      console.error(error);
    });
};

export const dataFromDatabaseEntry = entry => {
  return new Promise((resolve, reject) => {
    if (entry && entry.composerJSON) {
      resolve(dataFromJSONString(entry.composerJSON));
    } else if (entry && entry.composerPath) {
      resolve(dataFromYAMLFile(entry.composerPath));
    } else {
      reject("Could not find the YAML configuration file for the nodes");
    }
  });
};

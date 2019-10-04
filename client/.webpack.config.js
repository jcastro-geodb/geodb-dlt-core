// define child rescript
module.exports = config => {
  config.node = { __dirname: true };
  config.target = "electron-renderer";
  return config;
};

const packageInfo = require('../package.json');

const provider = {
  type: 'provider',
  version: packageInfo.version,
  name: 'elastic-sql',
  Model: require('./model'),
};

module.exports = provider;

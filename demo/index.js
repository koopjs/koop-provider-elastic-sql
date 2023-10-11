const Koop = require('@koopjs/koop-core');
const elasticSqlProvider = require('../src');
const koop = new Koop({ logLevel: 'info' });

// Elastic connection object, see: https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-connecting.html
const conn = {
  node: 'http://localhost:9200',
};

// Map of Elastic index-name to unique-identifer field
const idFieldMap = {
  fires: 'fireId',
};

// Map of Elastic index-name to unique-identifer field
const geometryFieldMap = {
  fires: 'location',
};

koop.register(elasticSqlProvider, { conn, idFieldMap, geometryFieldMap });

koop.server.listen(8080);

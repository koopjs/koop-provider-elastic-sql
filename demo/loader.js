const fs = require('fs');
const _ = require('lodash');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { Client } = require('@elastic/elasticsearch');
const client = new Client({
  node: 'http://localhost:9200', // Elasticsearch endpoint,
});

async function execute() {
  try {
    await client.indices.delete({ index: 'fires' });
  } catch (err) {
    console.log('no index to delete');
  }

  await client.index({ index: 'fires', document: {}, refresh: true });
  const result = await client.search({ index: 'fires' });

  await client.delete({ index: 'fires', id: result.hits.hits[0]._id });

  await client.indices.putMapping({
    index: 'fires',
    properties: {
      fireId: {
        type: 'keyword',
      },
      fireName: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      fireType: {
        type: 'keyword',
      },
      acres: {
        type: 'unsigned_long',
      },
      location: {
        type: 'geo_point',
      },
    },
  });

  await pipeline(
    fs.createReadStream('test-data.json.gz'),
    zlib.Unzip(),
    fs.createWriteStream('wildfires.json'),
  );

  const features = require('./wildfires.json');

  const chunks = _.chain(features)
    .map((feature) => {
      const { properties, geometry } = feature;

      return [
        {
          create: { _index: 'fires' },
        },
        {
          fireId: properties.FIRE_ID,
          fireName: properties.FIRE_NAME,
          fireType: properties.FIRE_TYPE,
          acres: properties.ACRES,
          location: geometry,
        },
      ];
    })
    .flatten()
    .chunk(1000)
    .value();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    await client.bulk({
      body: chunk,
    });
  }
  return;
}

execute()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });

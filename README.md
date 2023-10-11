# koop-provider-elastic-sql
Provider to fetch data in  elastic/opensearch datastores through the SQL API.  This provider leverages the SQL API exclusively, and as such, it is limited by the capabilities of that API.

## Data considerations
In order to gain the greatest efficiency from this provider, each document/record in _your dataset should have a unique-indentifier that is a property of the document/record_. This is important, because even though Elastic will create its own `_id` field as part of a document's metadata, _metadata fields are not accessible via the SQL API_.

If your data has a geometry and you want leverage Elastic's geo-filter capability (and you should), the geometry field needs to be mapped in your Elasticsearch Index as a [geopoint](https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-point.html) or [geoshape](https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-shape.html).

A key aspect of working with Elastic is that its API will only return a maximum of 10000 records in any request. If your dataset has more than 10000 records and you request doesn't result in a set that is less than 10000 records, the results will be truncated. This limits the ability to paginate.  To reduce the risk of truncation you should always use a unique-identifier property, a mapped geometry field, and registered the provider with the index mappings for these fields (more on this below).

## Usage

Register the provider with Koop:

```js
const Koop = require('@koopjs/koop-core');
const koop = new Koop({ logLevel: 'info'});
const elasticSqlProvider = require('@koopjs/provider-elastic-sql');

koop.register(elasticSqlProvider, { conn, idFieldMap, geometryFieldMap });
```

### Registration parameters

#### `conn` (required)
An object that contains connection details for the target Elastic cluster.  See the [Elastic documentation](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/client-connecting.html) for details. 

#### `idFieldMap` (optional)
An key/value populated object that serves as a lookup/dictionary for the unique-identifier field of a given Elastic index.  For example, if your index is named "my-index", and the documents in the that index have a field called "some-id-prop" that can be used as a unique-identifier, then the `idFieldMap` would look like:

```js
const idFieldMap = {
  'my-index': 'some-id-prop'
};
```

The `idFieldMap` can have multiple key/value pairs if your Elastic cluster has multiple indicies.

If you omit the `idFieldMap`, filtering requested with the GeoService `objectsIds` parameter will not be executed by the Elastic SQL API.

#### `geometryFieldMap` (optional)
An key/value populated object that serves as a lookup/dictionary for the geopoint/geoshape field of a given Elastic index.  For example, if your index is named "my-index", and the geometry of a document is stored in a geoshape field called "the-geo-prop", then the `geometryFieldMap` would look like:

```js
const idFieldMap = {
  'my-index': 'the-geo-prop'
};
```

While elastic has no limit on the number of geo-fields per document, conversion of a document to GeoJSON requires that we identify a single field as the definitive geometry. The `geometryFieldMap` can have multiple key/value pairs if your Elastic cluster has multiple indicies.

If you omit the `geometryFieldMap`, the GeoJSON produced by the provider will not include a geometry.  In addition, geometry filtering will not be executed by the Elastic instance.

### Route parameters

#### `id`
Once registered with Koop, the provide will expose routes with an `id` parameter. For example:

```sh
/elastic/rest/services/:id/FeatureServer
```

The `id` parameter should be filled with the name of the Elastic index you are targeting.  So if you wished to query the `fires` document-index on you Elastic instance, you would make a request to:

```sh
/elastic/rest/services/fires/FeatureServer/0/query
```


## Demo

The repository includes a demonstration project.  To run the demo you will need Docker installed on your computer. Once installed you can following the steps below to create a local Elastic instance and load it with sample data:

```sh
> npm install

> cd demo

# use Docker to run Elastic/Kibana
> docker-compose up -d

# load sample data; this will create an Elastc index named "fires"
> node loader.js 

# start the Koop application
> node demo.js
```
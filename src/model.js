const { Client } = require('@elastic/elasticsearch');
const _ = require('lodash');
const { wktToGeoJSON } = require('@terraformer/wkt');
const { standardizeGeometryFilter } = require('@koopjs/geoservice-utils');
const {
  validateConn,
  validateIdFieldMap,
  validateGeometryFieldMap,
} = require('./validate');

const relationLookup = {
  esriSpatialRelIntersects: 'intersects',
  esriSpatialRelContains: 'contains',
  esriSpatialRelWithin: 'within',
};

class Model {
  #client;
  #logger;
  #geometryFieldMap;
  #idFieldMap;

  constructor({ logger }, { conn, geometryFieldMap, idFieldMap } = {}) {
    this.#logger = logger;

    // Validate registration options
    try {
      validateConn(conn);

      if (idFieldMap) {
        validateIdFieldMap(idFieldMap);
      }

      if (geometryFieldMap) {
        validateGeometryFieldMap(geometryFieldMap);
      }
    } catch (error) {
      this.#logger.error(`Provider registration error: ${error.message}`);
      throw error;
    }

    // configure the elastic client
    this.#client = new Client(conn);

    // define a lookup to find the geometry field for a given elastic index
    this.#geometryFieldMap = geometryFieldMap || {};

    // define a lookup to find the id-field for a given elastic index
    this.#idFieldMap = idFieldMap || {};
  }

  async getData(req, callback) {
    const {
      query: geoserviceParams,
      params: { id: elasticIndexName },
    } = req;

    const { geometry, resultRecordCount } = geoserviceParams;
    const idField = this.#idFieldMap[elasticIndexName];
    const geometryField = this.#geometryFieldMap[elasticIndexName];

    const dataStoreQueryBody = {
      fetch_size: resultRecordCount || 1000,
    };

    try {
      dataStoreQueryBody.query = buildSqlQuery({
        ...geoserviceParams,
        idField,
        geometryField,
        elasticIndexName,
      });

      if (geometryField && geometry) {
        dataStoreQueryBody.filter = buildGeoshapeFilter({
          ...geoserviceParams,
          geometryField,
        });
      }

      const results = await this.#client.sql.query(dataStoreQueryBody);

      const geojson = convertToGeojson(results, geometryField);

      geojson.metadata = { idField };

      geojson.filtersApplied = generateFiltersApplied({
        ...geoserviceParams,
        idField,
        geometryField,
        geometry,
      });

      callback(null, geojson);
    } catch (err) {
      const error = this.#handleError(err);
      callback(error);
    }
  }

  #handleError(error) {
    const messagePrefix = 'Provider error:';

    if (error.name === 'ResponseError') {
      this.#logger.error(
        `${messagePrefix} data-store query failure, ${error.message}`,
      );
      const message = error?.body?.status === 400 ? 'invalid input' : error.message;
      const err = new Error(message);
      err.code = error?.body?.status || 500;
      return err;
    }

    this.#logger.error(`${messagePrefix}, ${JSON.stringify(error)}`);
    return error;
  }
}

function buildSqlQuery(params) {
  const {
    where,
    outFields = '*',
    orderByFields,
    objectIds,
    geometryField,
    elasticIndexName,
    idField,
  } = params;

  const from = ` FROM ${elasticIndexName}`;

  const selectFields = geometryField
    ? `${outFields}, ${geometryField}`
    : outFields;

  const whereClause = buildSqlWhere({ where, objectIds, idField });

  const orderByClause = orderByFields ? ` ORDER BY ${orderByFields}` : '';

  return `SELECT ${selectFields}${from}${whereClause}${orderByClause}`;
}

function buildSqlWhere({ where, objectIds, idField }) {
  const sqlWhereComponents = [];

  if (!where && objectIds === undefined) {
    return '';
  }

  if (where) {
    sqlWhereComponents.push(where);
  }

  if (idField && objectIds) {
    const objectIdsComponent = objectIds
      .split(',')
      .map((val) => {
        return isNaN(val) ? `'${val}'` : val;
      })
      .join(',')
      .replace(/^/, `${idField} IN (`)
      .replace(/$/, ')');

    sqlWhereComponents.push(objectIdsComponent);
  }

  return ' WHERE ' + sqlWhereComponents.join(' AND ');
}

function buildGeoshapeFilter({ geometryField, geometry, inSR, spatialRel }) {
  const { geometry: geometryFilter, relation } = standardizeGeometryFilter({
    geometry,
    inSR,
    reprojectionSR: 4326,
    spatialRel,
  });

  return {
    geo_shape: {
      [geometryField]: {
        shape: {
          type: geometryFilter.type.toLowerCase(),
          coordinates: geometryFilter.coordinates,
        },
        relation: relationLookup[relation] || 'intersects',
      },
    },
  };
}

function convertToGeojson(results, geometryField) {
  const keys = results.columns.map((col) => col.name);
  const rowToFeature = convertRowToFeature.bind(null, keys, geometryField);
  const features = results.rows.map(rowToFeature);

  return {
    type: 'FeatureCollection',
    features,
  };
}

function convertRowToFeature(featureAttributeKeys, geometryField, row) {
  const properties = row.reduce((feature, val, i) => {
    feature[featureAttributeKeys[i]] = val;
    return feature;
  }, {});

  const geomFieldIndex = featureAttributeKeys.indexOf(geometryField);

  return {
    properties: _.omit(properties, geometryField),
    geometry: row[geomFieldIndex] && wktToGeoJSON(row[geomFieldIndex]),
  };
}

function generateFiltersApplied({ where, objectIds, orderByFields, idField, geometry, geometryField }) {
  const filtersApplied = {};

  if (where) {
    filtersApplied.where = true;
  }

  if (objectIds && idField) {
    filtersApplied.objectIds = true;
  }

  if (orderByFields) {
    filtersApplied.orderByFields = true;
  }

  if (geometry && geometryField) {
    filtersApplied.geometry = true;
  }

  return filtersApplied;
}

module.exports = Model;

const joi = require('joi');

const connSchema = joi.object().required();

const idFieldMapSchema = joi.object().required();

const geometryFieldMapSchema = joi.object().required();

function validateConn(conn) {
  const { error } = connSchema.validate(conn);
  if (error) {
    throw new Error(
      `invalid client connection config, ${error.details[0].message}`,
    );
  }
}

function validateIdFieldMap(idFieldMap) {
  const { error } = idFieldMapSchema.validate(idFieldMap);
  if (error) {
    if (error.message === '"value" must be of type object') {
      throw new Error('invalid "idFieldMap", must be a key/value object');
    }
    throw new Error(`invalid "idFieldMap", ${error.details[0].message}`);
  }
}

function validateGeometryFieldMap(geometryFieldMap) {
  const { error } = geometryFieldMapSchema.validate(geometryFieldMap);
  if (error) {
    if (error.message === '"value" must be of type object') {
      throw new Error('invalid "geometryFieldMap", must be a key/value object');
    }
    throw new Error(`invalid "geometryFieldMap", ${error.details[0].message}`);
  }
}

module.exports = {
  validateConn,
  validateGeometryFieldMap,
  validateIdFieldMap,
};

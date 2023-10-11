const joi = require('joi');

const connSchema = joi.object().required();

const idFieldMapSchema = joi.object().required();

const geometryFieldMapSchema = joi.object().required();

function validateConn(conn) {
  const { error } = connSchema.validate(conn);
  if (error?.message === '"value" is required') {
    throw new Error('client connection configuration object is required');
  }

  if (error) {
    throw new Error(
      `invalid "conn", ${error.details[0].message.replace('"value" ', '')}`,
    );
  }
}

function validateIdFieldMap(idFieldMap) {
  const { error } = idFieldMapSchema.validate(idFieldMap);
  if (error) {
    throw new Error(`invalid "idFieldMap", ${error.details[0].message.replace('"value" ', '')}`);
  }
}

function validateGeometryFieldMap(geometryFieldMap) {
  const { error } = geometryFieldMapSchema.validate(geometryFieldMap);
  if (error) {
    throw new Error(`invalid "geometryFieldMap", ${error.details[0].message.replace('"value" ', '')}`);
  }
}

module.exports = {
  validateConn,
  validateGeometryFieldMap,
  validateIdFieldMap,
};

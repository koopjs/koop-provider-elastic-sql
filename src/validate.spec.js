const { validateConn, validateGeometryFieldMap, validateIdFieldMap } = require('./validate');

describe('validation functions', () => {
  describe('validateConn', () => {
    test('validateConn, success', () => {
      expect(validateConn({})).toBe(undefined);
    });
  
    test('validateConn, failure when missing', () => {
      try {
        validateConn();
        throw new Error('should have thrown');
      } catch (error) {
        expect(error.message).toBe('client connection configuration object is required');
      }
    });
  
    test('validateConn, failure when wrong data type', () => {
      try {
        validateConn('string');
        throw new Error('should have thrown');
      } catch (error) {
        expect(error.message).toBe('invalid "conn", must be of type object');
      }
    });
  });

  describe('validateIdFieldMap', () => {
    test('validateIdFieldMap, success', () => {
      expect(validateIdFieldMap({ index: 'field' })).toBe(undefined);
    });
  
    test('validateIdFieldMap, failure when wrong data type', () => {
      try {
        validateIdFieldMap('string');
        throw new Error('should have thrown');
      } catch (error) {
        expect(error.message).toBe('invalid "idFieldMap", must be of type object');
      }
    });
  });

  describe('validateGeometryFieldMap', () => {
    test('validateGeometryFieldMap, success', () => {
      expect(validateGeometryFieldMap({ index: 'field' })).toBe(undefined);
    });
  
    test('validateGeometryFieldMap, failure when wrong data type', () => {
      try {
        validateGeometryFieldMap('string');
        throw new Error('should have thrown');
      } catch (error) {
        expect(error.message).toBe('invalid "geometryFieldMap", must be of type object');
      }
    });
  });
});
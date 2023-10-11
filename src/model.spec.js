const { promisify } = require('util');
const Provider = require('./model');
const elastic = require('@elastic/elasticsearch');

jest.mock('@elastic/elasticsearch');
const elasticQueryMock = jest.fn(() => {
  return {
    rows: [
      ['AK64', 'POINT (-144.67 64.48)', 'GLACIER CREEK'],
      ['SD43', 'POINT (-102.84 43.08)', 'SANDOZ'],
    ],
    columns: [{ name: 'id' }, { name: 'location' }, { name: 'name' }],
  };
});

elastic.Client.mockImplementation(function () {
  return {
    sql: {
      query: elasticQueryMock,
    },
  };
});

const logger = {
  error: () => {},
};

describe('Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('instantiate without options', () => {
      const provider = new Provider(
        { logger },
        { conn: { node: 'http://localhost' } },
      );
      expect(provider.getData).toBeInstanceOf(Function);
    });

    test('instantiate with options', () => {
      const provider = new Provider(
        { logger },
        {
          conn: { node: 'http://localhost' },
          idFieldMap: { 'my-index': 'id' },
          geometryFieldMap: { 'my-index': 'location' },
        },
      );
      expect(provider.getData).toBeInstanceOf(Function);
    });

    test('instantiate with invalid options', () => {
      try {
        new Provider(
          { logger },
          {
            conn: 'test',
          },
        );
        throw new Error('should have thrown');
      } catch (error) {
        expect(error.message).toBe(
          'invalid "conn", must be of type object',
        );
      }
    });
  });

  describe('getData', () => {
    test('with field maps, no query options', async () => {
      const provider = new Provider(
        { logger },
        {
          conn: { node: 'http://localhost' },
          idFieldMap: { 'my-index': 'id' },
          geometryFieldMap: { 'my-index': 'location' },
        },
      );
      const getData = promisify(provider.getData).bind(provider);

      const result = await getData({ query: {}, params: { id: 'my-index' } });
      expect(result).toEqual({
        type: 'FeatureCollection',
        features: [
          {
            geometry: { type: 'Point', coordinates: [-144.67, 64.48] },
            properties: { id: 'AK64', name: 'GLACIER CREEK' },
          },
          {
            geometry: { type: 'Point', coordinates: [-102.84, 43.08] },
            properties: { id: 'SD43', name: 'SANDOZ' },
          },
        ],
        metadata: { idField: 'id' },
        filtersApplied: {},
      });
      expect(elasticQueryMock.mock.calls[0]).toEqual([
        {
          fetch_size: 1000,
          query: 'SELECT *, location FROM my-index',
        },
      ]);
    });

    test('with field maps, with geometry filter', async () => {
      const provider = new Provider(
        { logger },
        {
          conn: { node: 'http://localhost' },
          idFieldMap: { 'my-index': 'id' },
          geometryFieldMap: { 'my-index': 'location' },
        },
      );
      const getData = promisify(provider.getData).bind(provider);

      const result = await getData({
        query: {
          geometry: '-123,45,-120,49',
        },
        params: { id: 'my-index' },
      });

      expect(result).toEqual({
        type: 'FeatureCollection',
        features: [
          {
            geometry: { type: 'Point', coordinates: [-144.67, 64.48] },
            properties: { id: 'AK64', name: 'GLACIER CREEK' },
          },
          {
            geometry: { type: 'Point', coordinates: [-102.84, 43.08] },
            properties: { id: 'SD43', name: 'SANDOZ' },
          },
        ],
        metadata: { idField: 'id' },
        filtersApplied: {
          geometry: true,
        },
      });
      expect(elasticQueryMock.mock.calls[0]).toEqual([
        {
          fetch_size: 1000,
          query: 'SELECT *, location FROM my-index',
          filter: {
            geo_shape: {
              location: {
                relation: 'intersects',
                shape: {
                  coordinates: [
                    [
                      [-123, 45],
                      [-120, 45],
                      [-120, 49],
                      [-123, 49],
                      [-123, 45],
                    ],
                  ],
                  type: 'polygon',
                },
              },
            },
          },
        },
      ]);
    });

    test('with field maps, with geometry filter w/ relation', async () => {
      const provider = new Provider(
        { logger },
        {
          conn: { node: 'http://localhost' },
          idFieldMap: { 'my-index': 'id' },
          geometryFieldMap: { 'my-index': 'location' },
        },
      );
      const getData = promisify(provider.getData).bind(provider);

      const result = await getData({
        query: {
          geometry: '-123,45,-120,49',
          spatialRel: 'esriSpatialRelUnknown'
        },
        params: { id: 'my-index' },
      });

      expect(result).toEqual({
        type: 'FeatureCollection',
        features: [
          {
            geometry: { type: 'Point', coordinates: [-144.67, 64.48] },
            properties: { id: 'AK64', name: 'GLACIER CREEK' },
          },
          {
            geometry: { type: 'Point', coordinates: [-102.84, 43.08] },
            properties: { id: 'SD43', name: 'SANDOZ' },
          },
        ],
        metadata: { idField: 'id' },
        filtersApplied: {
          geometry: true,
        },
      });

      expect(elasticQueryMock.mock.calls[0]).toEqual([
        {
          fetch_size: 1000,
          query: 'SELECT *, location FROM my-index',
          filter: {
            geo_shape: {
              location: {
                relation: 'intersects',
                shape: {
                  coordinates: [
                    [
                      [-123, 45],
                      [-120, 45],
                      [-120, 49],
                      [-123, 49],
                      [-123, 45],
                    ],
                  ],
                  type: 'polygon',
                },
              },
            },
          },
        },
      ]);
    });

    test('with field maps, with where filter', async () => {
      const provider = new Provider(
        { logger },
        {
          conn: { node: 'http://localhost' },
          idFieldMap: { 'my-index': 'id' },
          geometryFieldMap: { 'my-index': 'location' },
        },
      );
      const getData = promisify(provider.getData).bind(provider);

      const result = await getData({
        query: {
          where: 'foo=\'bar\'',
        },
        params: { id: 'my-index' },
      });

      expect(result).toEqual({
        type: 'FeatureCollection',
        features: [
          {
            geometry: { type: 'Point', coordinates: [-144.67, 64.48] },
            properties: { id: 'AK64', name: 'GLACIER CREEK' },
          },
          {
            geometry: { type: 'Point', coordinates: [-102.84, 43.08] },
            properties: { id: 'SD43', name: 'SANDOZ' },
          },
        ],
        metadata: { idField: 'id' },
        filtersApplied: {
          where: true,
        },
      });
      expect(elasticQueryMock.mock.calls[0]).toEqual([
        {
          fetch_size: 1000,
          query: "SELECT *, location FROM my-index WHERE foo='bar'",
        },
      ]);
    });

    test('with field maps, with objectIds filter', async () => {
      const provider = new Provider(
        { logger },
        {
          conn: { node: 'http://localhost' },
          idFieldMap: { 'my-index': 'id' },
          geometryFieldMap: { 'my-index': 'location' },
        },
      );
      const getData = promisify(provider.getData).bind(provider);

      const result = await getData({
        query: {
          objectIds: 'a,b,c',
        },
        params: { id: 'my-index' },
      });

      expect(result).toEqual({
        type: 'FeatureCollection',
        features: [
          {
            geometry: { type: 'Point', coordinates: [-144.67, 64.48] },
            properties: { id: 'AK64', name: 'GLACIER CREEK' },
          },
          {
            geometry: { type: 'Point', coordinates: [-102.84, 43.08] },
            properties: { id: 'SD43', name: 'SANDOZ' },
          },
        ],
        metadata: { idField: 'id' },
        filtersApplied: {
          objectIds: true,
        },
      });
      expect(elasticQueryMock.mock.calls[0]).toEqual([
        {
          fetch_size: 1000,
          query: 'SELECT *, location FROM my-index WHERE id IN (\'a\',\'b\',\'c\')',
        },
      ]);
    });

    test('with field maps, with numeric objectIds filter', async () => {
      const provider = new Provider(
        { logger },
        {
          conn: { node: 'http://localhost' },
          idFieldMap: { 'my-index': 'id' },
          geometryFieldMap: { 'my-index': 'location' },
        },
      );
      const getData = promisify(provider.getData).bind(provider);

      const result = await getData({
        query: {
          objectIds: '1,2',
        },
        params: { id: 'my-index' },
      });

      expect(result).toEqual({
        type: 'FeatureCollection',
        features: [
          {
            geometry: { type: 'Point', coordinates: [-144.67, 64.48] },
            properties: { id: 'AK64', name: 'GLACIER CREEK' },
          },
          {
            geometry: { type: 'Point', coordinates: [-102.84, 43.08] },
            properties: { id: 'SD43', name: 'SANDOZ' },
          },
        ],
        metadata: { idField: 'id' },
        filtersApplied: {
          objectIds: true,
        },
      });
      expect(elasticQueryMock.mock.calls[0]).toEqual([
        {
          fetch_size: 1000,
          query: 'SELECT *, location FROM my-index WHERE id IN (1,2)',
        },
      ]);
    });

    test('with field maps, with orderByFields sorting', async () => {
      const provider = new Provider(
        { logger },
        {
          conn: { node: 'http://localhost' },
          idFieldMap: { 'my-index': 'id' },
          geometryFieldMap: { 'my-index': 'location' },
        },
      );
      const getData = promisify(provider.getData).bind(provider);

      const result = await getData({
        query: {
          orderByFields: 'name',
        },
        params: { id: 'my-index' },
      });

      expect(result).toEqual({
        type: 'FeatureCollection',
        features: [
          {
            geometry: { type: 'Point', coordinates: [-144.67, 64.48] },
            properties: { id: 'AK64', name: 'GLACIER CREEK' },
          },
          {
            geometry: { type: 'Point', coordinates: [-102.84, 43.08] },
            properties: { id: 'SD43', name: 'SANDOZ' },
          },
        ],
        metadata: { idField: 'id' },
        filtersApplied: {
          orderByFields: true,
        },
      });
      expect(elasticQueryMock.mock.calls[0]).toEqual([
        {
          fetch_size: 1000,
          query: 'SELECT *, location FROM my-index ORDER BY name',
        },
      ]);
    });

    test('without field maps, no query options', async () => {
      const provider = new Provider(
        { logger },
        {
          conn: { node: 'http://localhost' }
        },
      );
      const getData = promisify(provider.getData).bind(provider);

      const result = await getData({ query: {}, params: { id: 'my-index' } });
      expect(result).toEqual({
        type: 'FeatureCollection',
        features: [
          {
            geometry: undefined,
            properties: { id: 'AK64', location: 'POINT (-144.67 64.48)', name: 'GLACIER CREEK' },
          },
          {
            geometry: undefined,
            properties: { id: 'SD43', location: 'POINT (-102.84 43.08)', name: 'SANDOZ' },
          },
        ],
        metadata: { idField: undefined },
        filtersApplied: {},
      });
      expect(elasticQueryMock.mock.calls[0]).toEqual([
        {
          fetch_size: 1000,
          query: 'SELECT * FROM my-index',
        },
      ]);
    });

    test('handle elastic 400 error', async () => {
      elastic.Client.mockImplementationOnce(function () {
        return {
          sql: {
            query: () => {
              const error = new Error('bad input');
              error.name = 'ResponseError';
              error.body = { status: 400 };
              throw error;
            },
          },
        };
      });
      const provider = new Provider(
        { logger },
        {
          conn: { node: 'http://localhost' },
          idFieldMap: { 'my-index': 'id' },
          geometryFieldMap: { 'my-index': 'location' },
        },
      );
      const getData = promisify(provider.getData).bind(provider);

      try {
        await getData({ query: {}, params: { id: 'my-index' } });
        throw new Error('should have thrown');
      } catch (error) {
        expect(error.message).toBe('invalid input');
        expect(error.code).toBe(400);
      }
    });

    test('handle elastic 500 error', async () => {
      elastic.Client.mockImplementationOnce(function () {
        return {
          sql: {
            query: () => {
              const error = new Error('something went wrong');
              error.name = 'ResponseError';
              throw error;
            },
          },
        };
      });
      const provider = new Provider(
        { logger },
        {
          conn: { node: 'http://localhost' },
          idFieldMap: { 'my-index': 'id' },
          geometryFieldMap: { 'my-index': 'location' },
        },
      );
      const getData = promisify(provider.getData).bind(provider);

      try {
        await getData({ query: {}, params: { id: 'my-index' } });
        throw new Error('should have thrown');
      } catch (error) {
        expect(error.message).toBe('something went wrong');
        expect(error.code).toBe(500);
      }
    });

    test('handle other error', async () => {
      elastic.Client.mockImplementationOnce(function () {
        return {
          sql: {
            query: () => {
              throw new Error('something went wrong');
            },
          },
        };
      });
      const provider = new Provider(
        { logger },
        {
          conn: { node: 'http://localhost' },
          idFieldMap: { 'my-index': 'id' },
          geometryFieldMap: { 'my-index': 'location' },
        },
      );
      const getData = promisify(provider.getData).bind(provider);

      try {
        await getData({ query: {}, params: { id: 'my-index' } });
        throw new Error('should have thrown');
      } catch (error) {
        expect(error.message).toBe('something went wrong');
      }
    });
  });
});

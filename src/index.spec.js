const { name, type, Model, version } = require('./index');

describe('registration object', () => {
  test('has expected properties', () => {
    expect(name).toBe('elastic-sql');
    expect(type).toBe('provider');
    expect(version).toBeDefined();
    expect(Model).toBeInstanceOf(Function);
  });
});
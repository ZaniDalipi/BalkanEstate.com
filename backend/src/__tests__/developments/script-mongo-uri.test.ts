import { resolveScriptMongoUri, redactMongoUri, DEFAULT_MONGO_URI } from '../../utils/scriptMongoUri';

describe('script Mongo URI', () => {
  it('uses the server variable first so scripts and the app share a database', () => {
    expect(resolveScriptMongoUri({ MONGODB_URI: 'mongodb://a/x', MONGO_URI: 'mongodb://b/y' } as never)).toEqual({ uri: 'mongodb://a/x', source: 'MONGODB_URI' });
    expect(resolveScriptMongoUri({ MONGO_URI: 'mongodb://b/y' } as never).source).toBe('MONGO_URI');
    expect(resolveScriptMongoUri({} as never)).toEqual({ uri: DEFAULT_MONGO_URI, source: 'default' });
  });
  it('never prints the password', () => {
    expect(redactMongoUri('mongodb+srv://admin:s3cr3t@cluster0.example.net/balkan')).toBe('mongodb+srv://admin:***@cluster0.example.net/balkan');
    expect(redactMongoUri('mongodb://localhost:27017/balkan-estate')).toBe('mongodb://localhost:27017/balkan-estate');
  });
});

/**
 * The MongoDB connection a maintenance script should use: the same variable the
 * server reads (MONGODB_URI, see config/database.ts) so scripts and the running
 * app always see the same data; MONGO_URI is accepted as a legacy fallback.
 */
export const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/balkan-estate';

export const resolveScriptMongoUri = (env: NodeJS.ProcessEnv = process.env): { uri: string; source: string } => {
  if (env.MONGODB_URI) return { uri: env.MONGODB_URI, source: 'MONGODB_URI' };
  if (env.MONGO_URI) return { uri: env.MONGO_URI, source: 'MONGO_URI' };
  return { uri: DEFAULT_MONGO_URI, source: 'default' };
};

/** The URI with any password removed, safe to print. */
export const redactMongoUri = (uri: string): string => uri.replace(/\/\/([^:@/]+):[^@/]*@/, '//$1:***@');

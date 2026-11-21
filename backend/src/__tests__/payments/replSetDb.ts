/**
 * A single-node replica set for suites whose code uses Mongo transactions
 * (the grant service, payment orders). The shared setup.ts database is a
 * standalone server, which refuses transactions.
 *
 * Use at the top of a test file:
 *
 *   process.env.SKIP_TEST_DB = 'true';      // before imports: opt out of setup.ts's database
 *   useReplSetDatabase([Product, User, ...]);
 *
 * The models listed get their collections and indexes created up front:
 * a transaction can't create a collection, and the unique indexes are what
 * stop a payment being recorded twice. Not a test file itself.
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

interface InitModel {
  init(): Promise<unknown>;
  createCollection(): Promise<unknown>;
}

export function useReplSetDatabase(models: InitModel[]): void {
  let replSet: MongoMemoryReplSet | undefined;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    await mongoose.connect(replSet.getUri());
    for (const model of models) {
      await model.createCollection().catch(() => undefined);
      await model.init();
    }
  }, 120_000);

  afterEach(async () => {
    for (const collection of Object.values(mongoose.connection.collections)) {
      await collection.deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet?.stop();
  });
}

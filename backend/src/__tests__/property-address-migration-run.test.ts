process.env.SKIP_TEST_DB = 'true';

/**
 * The migration's control flow, without a database.
 *
 * The formatter is covered separately; what is proved here is the part that
 * touches data: that a dry run writes nothing, that an apply writes only the
 * rows that actually change, that a listing missing its city is left alone
 * rather than guessed at, and that a second run is a no-op.
 */

const connect = jest.fn().mockResolvedValue(undefined);
const disconnect = jest.fn().mockResolvedValue(undefined);
const bulkWrite = jest.fn().mockImplementation((ops: unknown[]) =>
  Promise.resolve({ modifiedCount: ops.length })
);

let rows: Record<string, unknown>[] = [];

jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    connect: (...args: unknown[]) => connect(...args),
    disconnect: (...args: unknown[]) => disconnect(...args),
  },
}));

jest.mock('../models/Property', () => ({
  __esModule: true,
  default: {
    find: () => ({
      limit: () => ({
        lean: () => ({
          cursor: () => ({
            async *[Symbol.asyncIterator]() {
              for (const row of rows) yield row;
            },
          }),
        }),
      }),
    }),
    bulkWrite: (...args: unknown[]) => bulkWrite(...args),
  },
}));

import { migratePropertyAddresses } from '../scripts/migratePropertyAddresses';

/** The `$set` each bulk operation would apply, flattened across all calls. */
const writtenAddresses = (): string[] =>
  bulkWrite.mock.calls.flatMap((call) =>
    (call[0] as { updateOne: { update: { $set: { address: string } } } }[]).map(
      (op) => op.updateOne.update.$set.address
    )
  );

beforeEach(() => {
  connect.mockClear();
  disconnect.mockClear();
  bulkWrite.mockClear();

  rows = [
    { _id: '1', address: 'Knez Mihailova 42', city: 'Belgrade', country: 'Serbia' },
    { _id: '2', address: 'Himarë, Bashkia Himarë, Vlorë County, 9425, Albania', city: 'Vlore', country: 'Albania' },
    { _id: '3', address: 'Ilica 123, Zagreb, Croatia', city: 'Zagreb', country: 'Croatia' },
    { _id: '4', address: '', city: 'Resen', country: 'North Macedonia' },
    // No city and no country: nothing to write the address against.
    { _id: '5', address: 'Somewhere', city: '', country: '' },
  ];
});

describe('migratePropertyAddresses', () => {
  it('writes nothing on a dry run', async () => {
    await migratePropertyAddresses({ apply: false, samples: 0 });

    expect(bulkWrite).not.toHaveBeenCalled();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('writes only the addresses that actually change', async () => {
    await migratePropertyAddresses({ apply: true, samples: 0 });

    // '3' is already in shape and is not written; '5' has no city and is skipped.
    expect(writtenAddresses()).toEqual([
      'Knez Mihailova 42, Belgrade, Serbia',
      'Himarë, Vlorë, Albania',
      'Resen, North Macedonia',
    ]);
  });

  it('leaves a listing with no city exactly as it is', async () => {
    await migratePropertyAddresses({ apply: true, samples: 0 });

    expect(writtenAddresses().some((address) => address.includes('Somewhere'))).toBe(false);
  });

  it('does nothing on a second run', async () => {
    await migratePropertyAddresses({ apply: true, samples: 0 });

    // Feed the migrated values back in, as a re-run against the same
    // collection would.
    const migrated = writtenAddresses();
    rows[0].address = migrated[0];
    rows[1].address = migrated[1];
    rows[3].address = migrated[2];
    bulkWrite.mockClear();

    await migratePropertyAddresses({ apply: true, samples: 0 });
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  it('touches only the address field', async () => {
    await migratePropertyAddresses({ apply: true, samples: 0 });

    for (const call of bulkWrite.mock.calls) {
      for (const op of call[0] as { updateOne: { update: Record<string, object> } }[]) {
        expect(Object.keys(op.updateOne.update)).toEqual(['$set']);
        expect(Object.keys(op.updateOne.update.$set)).toEqual(['address']);
      }
    }
  });
});

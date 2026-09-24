process.env.SKIP_TEST_DB = 'true';

/**
 * The area backfill's control flow, without a database.
 *
 * `resolveTotalArea` is covered separately; what is proved here is the part
 * that touches data. The migration exists because a listing with a breakdown
 * and no stated total is invisible to search, and it is only safe to run over
 * a live collection if it fills blanks and nothing else: a dry run writes
 * nothing, an apply writes only `sqft`, a listing that already states a size
 * is never re-measured, a type with nothing to derive a total from is left
 * alone rather than guessed at, and a second run is a no-op.
 */

const connect = jest.fn().mockResolvedValue(undefined);
const disconnect = jest.fn().mockResolvedValue(undefined);
const bulkWrite = jest.fn().mockImplementation((ops: unknown[]) =>
  Promise.resolve({ modifiedCount: (ops as unknown[]).length })
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
      select: () => ({
        lean: () => ({
          cursor: () => ({
            async *[Symbol.asyncIterator]() {
              // The script reads what the filter selected. The filter itself
              // is asserted separately, so the rows here stand in for its
              // result — plus two it would exclude, to prove the per-row
              // guards hold even if the query ever widened.
              for (const row of rows) yield row;
            },
          }),
        }),
      }),
    }),
    bulkWrite: (...args: unknown[]) => bulkWrite(...args),
  },
}));

import { backfillPropertyAreas, CANDIDATE_FILTER } from '../scripts/backfillPropertyAreas';

/** Every `$set` the run would apply, flattened across all batches. */
const writes = (): { _id: unknown; sqft: number }[] =>
  bulkWrite.mock.calls.flatMap((call) =>
    (call[0] as { updateOne: { filter: { _id: unknown }; update: { $set: { sqft: number } } } }[])
      .map((op) => ({ _id: op.updateOne.filter._id, sqft: op.updateOne.update.$set.sqft }))
  );

beforeEach(() => {
  connect.mockClear();
  disconnect.mockClear();
  bulkWrite.mockClear();

  rows = [
    // The listing this whole change set started from.
    { _id: 'flat', propertyType: 'apartment', sqft: 0, grossArea: 79, netArea: 70 },
    // Never stated a total at all, rather than stating zero.
    { _id: 'flat-no-field', propertyType: 'apartment', netArea: 64 },
    { _id: 'villa', propertyType: 'villa', sqft: 0, landArea: 5550.5, buildingArea: 516 },
    { _id: 'house', propertyType: 'house', sqft: 0, landArea: 600, buildingArea: 140 },
    { _id: 'shop', propertyType: 'commercial', sqft: 0, openPlanArea: 102.5 },
    // A plot carrying a landArea its type is not described by: nothing to
    // derive a total from, so it keeps its zero rather than being given one.
    { _id: 'plot', propertyType: 'land', sqft: 0, landArea: 400 },
    // States a size, but the wrong one: 1500 m² of land with a 500 m² house
    // on it, stored as 500 back when the building area won. Only --resync
    // may correct this.
    { _id: 'stale-villa', propertyType: 'luxury-villa', sqft: 500, landArea: 1500, buildingArea: 500 },
  ];
});

describe('backfillPropertyAreas', () => {
  it('writes nothing on a dry run', async () => {
    await backfillPropertyAreas({ apply: false, resync: false, samples: 0 });

    expect(bulkWrite).not.toHaveBeenCalled();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('fills each listing from the measurement its type is described by', async () => {
    await backfillPropertyAreas({ apply: true, resync: false, samples: 0 });

    expect(writes()).toEqual([
      { _id: 'flat', sqft: 79 },           // gross, not net
      { _id: 'flat-no-field', sqft: 64 },
      { _id: 'villa', sqft: 5550.5 },      // the whole plot, not just the build
      { _id: 'house', sqft: 600 },
      { _id: 'shop', sqft: 102.5 },
    ]);
  });

  it('leaves a type with nothing to derive a total from exactly as it is', async () => {
    await backfillPropertyAreas({ apply: true, resync: false, samples: 0 });

    expect(writes().some((write) => write._id === 'plot')).toBe(false);
  });

  it('touches only the sqft field', async () => {
    await backfillPropertyAreas({ apply: true, resync: false, samples: 0 });

    for (const call of bulkWrite.mock.calls) {
      for (const op of call[0] as { updateOne: { update: Record<string, object> } }[]) {
        expect(Object.keys(op.updateOne.update)).toEqual(['$set']);
        expect(Object.keys(op.updateOne.update.$set)).toEqual(['sqft']);
      }
    }
  });

  it('does nothing on a second run', async () => {
    await backfillPropertyAreas({ apply: true, resync: false, samples: 0 });

    // Feed the filled-in values back, as a re-run against the same
    // collection would — except it would not see them at all, since they no
    // longer match the filter. Proving it here covers the case where it does.
    for (const write of writes()) {
      const row = rows.find((candidate) => candidate._id === write._id);
      if (row) row.sqft = write.sqft;
    }
    bulkWrite.mockClear();

    await backfillPropertyAreas({ apply: true, resync: false, samples: 0 });
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  it('never re-measures a listing that already states a size', async () => {
    // Not selected by the filter, but the guarantee is what matters: a real
    // total is never replaced by a breakdown value, however they disagree.
    rows = [{ _id: 'stated', propertyType: 'apartment', sqft: 120, grossArea: 79 }];

    await backfillPropertyAreas({ apply: true, resync: false, samples: 0 });
    expect(bulkWrite).not.toHaveBeenCalled();
  });
});

describe('the rows the migration asks for', () => {
  it('selects only listings with no stated size and a real breakdown', () => {
    expect(CANDIDATE_FILTER).toEqual({
      $and: [
        { $or: [{ sqft: { $exists: false } }, { sqft: null }, { sqft: 0 }] },
        {
          $or: [
            { grossArea: { $gt: 0 } },
            { netArea: { $gt: 0 } },
            { buildingArea: { $gt: 0 } },
            { landArea: { $gt: 0 } },
            { openPlanArea: { $gt: 0 } },
          ],
        },
      ],
    });
  });
});


describe('--resync, which makes the stored field say what the pages show', () => {
  it('corrects a total that disagrees with the breakdown', async () => {
    await backfillPropertyAreas({ apply: true, resync: true, samples: 0 });

    expect(writes()).toContainEqual({ _id: 'stale-villa', sqft: 1500 });
  });

  it('leaves that listing alone without the flag', async () => {
    await backfillPropertyAreas({ apply: true, resync: false, samples: 0 });

    expect(writes().some((write) => write._id === 'stale-villa')).toBe(false);
  });

  it('does not rewrite a row whose stored total already agrees', async () => {
    rows = [{ _id: 'agrees', propertyType: 'apartment', sqft: 98, grossArea: 98, netArea: 77 }];

    await backfillPropertyAreas({ apply: true, resync: true, samples: 0 });
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  it('still leaves a listing with no breakdown to go on exactly as it is', async () => {
    rows = [{ _id: 'legacy', propertyType: 'apartment', sqft: 120 }];

    await backfillPropertyAreas({ apply: true, resync: true, samples: 0 });
    expect(bulkWrite).not.toHaveBeenCalled();
  });

  it('is still a no-op on a second pass', async () => {
    await backfillPropertyAreas({ apply: true, resync: true, samples: 0 });
    for (const write of writes()) {
      const row = rows.find((candidate) => candidate._id === write._id);
      if (row) row.sqft = write.sqft;
    }
    bulkWrite.mockClear();

    await backfillPropertyAreas({ apply: true, resync: true, samples: 0 });
    expect(bulkWrite).not.toHaveBeenCalled();
  });
});

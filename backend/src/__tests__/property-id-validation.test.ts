/**
 * `validatePropertyId` guards /properties/:id/price-history, area-prices,
 * air-quality and surroundings. Property ids leave the API encoded, so the
 * guard must let the encoded form through, not only raw ObjectIds.
 */
process.env.SKIP_TEST_DB = 'true';

import type { NextFunction, Request, Response } from 'express';
import { validatePropertyId } from '../middleware/propertyValidation';
import { encodeId } from '../utils/idObfuscation';

const HEX = '65f1a2b3c4d5e6f708192a3b';

/** Run the middleware chain; true when it reaches the controller. */
const passes = async (id: string): Promise<boolean> => {
  const req = { params: { id }, query: {}, body: {} } as unknown as Request;
  let status = 200;
  const res = {
    status: (code: number) => { status = code; return res; },
    json: () => res,
  } as unknown as Response;
  for (const mw of validatePropertyId as Array<(rq: Request, rs: Response, nx: NextFunction) => unknown>) {
    let advanced = false;
    await mw(req, res, () => { advanced = true; });
    if (!advanced) return false;
  }
  return status === 200;
};

describe('validatePropertyId', () => {
  it('accepts a raw ObjectId', async () => {
    expect(await passes(HEX)).toBe(true);
  });

  it('accepts the encoded id the API hands out', async () => {
    expect(encodeId(HEX)).toHaveLength(16);
    expect(await passes(encodeId(HEX))).toBe(true);
  });

  it('accepts a slug ending in an encoded id', async () => {
    expect(await passes(`3-bed-flat-in-korce_${encodeId(HEX)}`)).toBe(true);
  });

  it('rejects anything that is not an id', async () => {
    expect(await passes('not-an-id')).toBe(false);
    expect(await passes('123')).toBe(false);
  });
});

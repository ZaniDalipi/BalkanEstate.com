import { describe, expect, it } from 'vitest';
import { readApiError, statusTextKey } from './apiError';

/** What httpClient throws: the body's code on the error, the whole body in `details`. */
const httpError = (status: number, body: Record<string, unknown>) =>
  Object.assign(new Error(String(body.message ?? 'x')), { statusCode: status, code: body.code ?? null, details: body });

describe('readApiError', () => {
  it('reads code, field and params from the nested body', () => {
    const err = httpError(409, { message: 'A1 already…', code: 'LINKS_TAKEN', details: { field: 'linkedUnitIds', params: { unit: 'P3', owner: 'A1' } } });
    expect(readApiError(err)).toEqual({ status: 409, code: 'LINKS_TAKEN', field: 'linkedUnitIds', params: { unit: 'P3', owner: 'A1' } });
  });

  it('reads the code from the body when the error has none', () => {
    const err = Object.assign(new Error('x'), { statusCode: 400, code: null, details: { code: 'NO_IMAGES' } });
    expect(readApiError(err)).toMatchObject({ status: 400, code: 'NO_IMAGES', params: {} });
  });

  it('keeps only string and finite number params', () => {
    const err = httpError(400, { code: 'FIELD_RANGE', details: { field: 'limit', params: { min: 1, max: 200, bad: { x: 1 }, nan: Number.NaN } } });
    expect(readApiError(err).params).toEqual({ min: 1, max: 200 });
  });

  it('has no code or field for an answer without them, and a status', () => {
    expect(readApiError(httpError(500, { message: 'Internal server error' }))).toEqual({ status: 500, code: undefined, field: undefined, params: {} });
  });

  it('marks a failed fetch (TypeError, no status) as a network error', () => {
    expect(readApiError(new TypeError('Failed to fetch'))).toMatchObject({ status: undefined, network: true });
    expect(readApiError(new Error('Session expired'))).not.toHaveProperty('network');
  });

  it('copes with nothing useful', () => {
    expect(readApiError(null)).toEqual({ params: {} });
    expect(readApiError('boom')).toEqual({ params: {} });
  });
});

describe('statusTextKey', () => {
  it.each([
    [400, 'badRequest'],
    [422, 'badRequest'],
    [401, 'forbidden'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'conflict'],
    [413, 'tooLarge'],
    [429, 'tooMany'],
    [500, 'server'],
    [503, 'server'],
    [undefined, 'server'],
  ] as const)('%s → %s', (status, key) => expect(statusTextKey(status)).toBe(key));

  it('says "offline" only when the request got no answer', () => expect(statusTextKey(undefined, true)).toBe('offline'));
});

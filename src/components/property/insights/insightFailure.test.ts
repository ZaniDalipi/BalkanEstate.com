import { describe, it, expect } from 'vitest';
import { toInsightFailure } from './insightFailure';
import { insightLanguageName } from './insightLanguage';

describe('toInsightFailure', () => {
  it('maps status codes to typed failures', () => {
    expect(toInsightFailure({ statusCode: 401 })).toEqual({ kind: 'unauthorized' });
    expect(toInsightFailure({ statusCode: 400, message: 'bad' })).toEqual({ kind: 'invalid', message: 'bad' });
    expect(toInsightFailure({ statusCode: 503 })).toEqual({ kind: 'unavailable' });
    expect(toInsightFailure({ statusCode: 500, message: 'boom' })).toEqual({ kind: 'other', message: 'boom' });
  });

  it('reads the quota from a 429 and never lets it be NaN', () => {
    expect(toInsightFailure({ statusCode: 429, message: 'limit', details: { used: 3, limit: 3 } })).toEqual({
      kind: 'rateLimited',
      message: 'limit',
      usage: { used: 3, limit: 3, remaining: 0 },
    });
    expect(toInsightFailure({ statusCode: 429, details: { used: 'x' } })).toMatchObject({
      usage: { used: 0, limit: 0, remaining: 0 },
    });
  });

  it('copes with non-error values', () => {
    expect(toInsightFailure(null)).toEqual({ kind: 'other', message: undefined });
    expect(toInsightFailure('oops')).toEqual({ kind: 'other', message: undefined });
  });
});

describe('insightLanguageName', () => {
  it('maps UI languages and falls back to English', () => {
    expect(insightLanguageName('sq')).toBe('Albanian');
    expect(insightLanguageName('sr-RS')).toBe('Serbian');
    expect(insightLanguageName('xx')).toBe('English');
    expect(insightLanguageName(undefined)).toBe('English');
  });
});

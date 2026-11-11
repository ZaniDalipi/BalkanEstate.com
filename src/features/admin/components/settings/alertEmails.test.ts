import { describe, expect, it } from 'vitest';
import { addEmails, sameList, splitEmailInput } from './alertEmails';

describe('splitEmailInput', () => {
  it('splits pasted lists on commas, semicolons and spaces', () => {
    expect(splitEmailInput(' A@x.com, b@y.org;c@z.io\nd@w.net ')).toEqual(['a@x.com', 'b@y.org', 'c@z.io', 'd@w.net']);
  });
});

describe('addEmails', () => {
  it('adds new addresses once', () => {
    expect(addEmails(['a@x.com'], 'A@x.com, b@y.org', 10)).toEqual({ ok: true, list: ['a@x.com', 'b@y.org'] });
  });

  it('names what is not an email', () => {
    expect(addEmails([], 'ok@x.com nope', 10)).toEqual({ ok: false, reason: 'invalid', invalid: ['nope'] });
  });

  it('stops at the limit and on empty input', () => {
    expect(addEmails(['a@x.com'], 'b@x.com', 1)).toMatchObject({ ok: false, reason: 'tooMany' });
    expect(addEmails([], '  ', 10)).toMatchObject({ ok: false, reason: 'empty' });
  });
});

describe('sameList', () => {
  it('compares in order', () => {
    expect(sameList(['a'], ['a'])).toBe(true);
    expect(sameList(['a', 'b'], ['b', 'a'])).toBe(false);
  });
});

/**
 * Pasting JSON must work with what copying actually produces, and a feed's
 * settings are checked before saving so it can't fail later for want of an address.
 */
import { describe, it, expect } from 'vitest';
import { cleanPastedJson, parsePastedJson } from '@/src/features/listing-sources/utils/pastedJson';
import { feedConfigProblems } from '@/src/features/listing-sources/utils/feedConfigProblems';
import { feedErrorText } from '@/src/features/listing-sources/utils/feedErrorText';
import { FEED_TEMPLATES } from '@/src/features/listing-sources/feedTemplate/feedTemplates';

const NBSP = String.fromCharCode(0xa0);
const ZWSP = String.fromCharCode(0x200b);
const LINE_SEP = String.fromCharCode(0x2028);

describe('parsePastedJson', () => {
  it('reads JSON indented with non-breaking spaces, as copied from a web page or chat', () => {
    const pasted = `{\n${NBSP}${NBSP}"listings": [\n${NBSP}${NBSP}${NBSP}${NBSP}{ "id": "adria-demo-001", "city": "Himarë" }\n${NBSP}${NBSP}]\n}`;
    expect(parsePastedJson(pasted)).toEqual({ ok: true, value: { listings: [{ id: 'adria-demo-001', city: 'Himarë' }] } });
  });

  it('fixes smart quotes, zero-width spaces, Unicode line breaks and trailing commas', () => {
    const pasted = `{${ZWSP}${LINE_SEP}“title”: “Villa”,}`;
    expect(parsePastedJson(pasted)).toEqual({ ok: true, value: { title: 'Villa' } });
    expect(cleanPastedJson(`[1, 2,]`)).toBe('[1, 2]');
  });

  it('says where broken JSON breaks', () => {
    const result = parsePastedJson('{\n  "title": "Villa"\n  "price": 1\n}');
    expect(result).toMatchObject({ ok: false, empty: false, line: 3 });
    expect(parsePastedJson('   ')).toEqual({ ok: false, empty: true });
  });

  it('reads both feed templates', () => {
    expect(parsePastedJson(FEED_TEMPLATES.json.text)).toMatchObject({ ok: true });
  });
});

describe('feedConfigProblems', () => {
  it('needs an address for API and XML feeds, and a web address at that', () => {
    expect(feedConfigProblems('customApi', {})).toEqual([{ field: 'endpoint', code: 'missingEndpoint' }]);
    expect(feedConfigProblems('customApi', { endpoint: 'api.example.com' })).toEqual([{ field: 'endpoint', code: 'invalidUrl' }]);
    expect(feedConfigProblems('customApi', { url: 'https://api.example.com/l' })).toEqual([]);
    expect(feedConfigProblems('xmlFeed', { endpoint: 'https://a.example/feed.xml' })).toEqual([]);
  });

  it('accepts pasted listings instead of an address, if they are still valid JSON', () => {
    expect(feedConfigProblems('jsonFeed', { inlineJson: '[{"title":"x"}]' })).toEqual([]);
    expect(feedConfigProblems('jsonFeed', { inlineJson: '[{' })).toEqual([{ field: 'inlineJson', code: 'invalidInlineJson' }]);
    expect(feedConfigProblems('jsonFeed', {})).toEqual([{ field: 'endpoint', code: 'missingSource' }]);
  });

  it('checks the other feed kinds', () => {
    expect(feedConfigProblems('rss', { feedUrls: [] })).toEqual([{ field: 'feedUrls', code: 'missingFeedUrl' }]);
    expect(feedConfigProblems('htmlScrape', { indexUrl: 'https://a.example/' })).toEqual([{ field: 'selectors', code: 'missingSelectors' }]);
    expect(feedConfigProblems('jsonLd', { sitemapOf: 'https://a.example/' })).toEqual([]);
    expect(feedConfigProblems('customApi', [])).toEqual([{ field: 'adapterConfig', code: 'notAnObject' }]);
  });
});

describe('feedErrorText', () => {
  const t = (key: string) => `T:${key}`;
  it('translates known problems and keeps other messages', () => {
    expect(feedErrorText(t, { code: 'missingEndpoint', message: 'x' })).toBe('T:listingFeeds:configError.missingEndpoint');
    expect(feedErrorText(t, { code: 'SOMETHING_ELSE', message: 'Server said no' })).toBe('Server said no');
  });
});

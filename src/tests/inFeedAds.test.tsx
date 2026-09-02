/**
 * In-feed ad placement rules.
 *
 * These ads sit between someone's search results, so the rules that keep them
 * from taking the page over matter as much as the ads themselves: a short list
 * gets none, a long scroll is capped, and an ad never trails the last card.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { interleaveInFeedAds } from '@/features/promo/components/InFeedSlot';

const cards = (n: number) =>
  Array.from({ length: n }, (_, i) => React.createElement('div', { key: i }, `card ${i}`));

/** Positions in the output that are ads rather than listing cards. */
const adIndexes = (out: React.ReactNode[]) =>
  out.reduce<number[]>((acc, node, i) => {
    const key = React.isValidElement(node) ? String(node.key) : '';
    if (key.includes('in-feed-ad')) acc.push(i);
    return acc;
  }, []);

describe('interleaveInFeedAds', () => {
  it('leaves a short result set alone', () => {
    // Six cards is one screenful — breaking it up would be all ad, no results.
    const out = interleaveInFeedAds(cards(6), 'search');
    expect(out).toHaveLength(6);
    expect(adIndexes(out)).toEqual([]);
  });

  it('drops an ad in after every sixth card', () => {
    const out = interleaveInFeedAds(cards(20), 'search');
    // Card 0-5, ad, cards 6-11, ad, cards 12-17, ad, cards 18-19.
    expect(adIndexes(out)).toEqual([6, 13, 20]);
  });

  it('caps how many ads one list can carry', () => {
    const out = interleaveInFeedAds(cards(200), 'search');
    expect(adIndexes(out)).toHaveLength(3);
  });

  it('never trails an ad after the last card', () => {
    // 12 cards would otherwise put an ad at the very end, after card 12.
    const out = interleaveInFeedAds(cards(12), 'search');
    const last = out[out.length - 1];
    const lastKey = React.isValidElement(last) ? String(last.key) : '';
    expect(lastKey).not.toContain('in-feed-ad');
    expect(adIndexes(out)).toEqual([6]);
  });

  it('keeps every listing card, in order', () => {
    const input = cards(30);
    const out = interleaveInFeedAds(input, 'search');
    const keptCards = out.filter(
      node => React.isValidElement(node) && !String(node.key).includes('in-feed-ad'),
    );
    expect(keptCards).toHaveLength(30);
    expect(keptCards.map(n => (React.isValidElement(n) ? n.props.children : null))).toEqual(
      input.map(n => (React.isValidElement(n) ? n.props.children : null)),
    );
  });

  it('gives each ad its own banner index so they are not all the same ad', () => {
    const out = interleaveInFeedAds(cards(30), 'search');
    const indexes = out
      .filter(n => React.isValidElement(n) && String(n.key).includes('in-feed-ad'))
      .map(n => (React.isValidElement(n) ? (n.props as { index: number }).index : -1));
    // Index 0 belongs to the page's own top banner, so in-feed starts at 1.
    expect(indexes).toEqual([1, 2, 3]);
  });

  it('honours a custom cadence', () => {
    const out = interleaveInFeedAds(cards(20), 'villas', { every: 4, max: 2 });
    expect(adIndexes(out)).toEqual([4, 9]);
  });
});

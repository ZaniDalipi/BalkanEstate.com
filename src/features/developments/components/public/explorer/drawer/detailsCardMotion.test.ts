import { describe, expect, it } from 'vitest';
import { detailsCardMotion } from './detailsCardMotion';

describe('detailsCardMotion', () => {
  it('glides the card in from the right beside the showcase, from below under it', () => {
    expect(detailsCardMotion(true, true, false).initial).toEqual({ x: 72, opacity: 0 });
    expect(detailsCardMotion(true, false, false).initial).toEqual({ y: 64, opacity: 0 });
    expect(detailsCardMotion(true, false, false).animate).toEqual({ x: 0, y: 0, opacity: 1 });
  });

  it('slides the plain column in from the edge', () => {
    expect(detailsCardMotion(false, true, false).initial).toEqual({ x: '100%' });
  });

  it('only fades under reduced motion', () => {
    const m = detailsCardMotion(true, false, true);
    expect(m.initial).toEqual({ opacity: 0 });
    expect(m.exit).toEqual({ opacity: 0 });
  });
});

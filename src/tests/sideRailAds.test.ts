/**
 * Side-rail sizing rules.
 *
 * The rails are absolutely positioned in a section's side margins, so two
 * things decide whether one may be drawn at all: whether it fits beside the
 * centred content, and whether the section is tall enough to contain it. Get
 * either wrong and the rail clips the section beside it, or spills out and
 * lands on the next one.
 */

import { describe, it, expect } from 'vitest';
import { pickRail, MIN_RAIL_SECTION_HEIGHT } from '@/features/promo/components/SideRails';

/** What the podium sections actually centre: 72rem. */
const CONTENT = 1152;

describe('pickRail', () => {
  it('uses a half-page when there is room for one', () => {
    // 1152 content + 2 × (300 + 20) = 1792
    expect(pickRail(1920, CONTENT)).toEqual({ format: 'halfpage', width: 300 });
  });

  it('still gives Full-HD a full-size half-page rail', () => {
    // A 1920px monitor leaves ~1840px of content area once the icon rail is
    // subtracted, and 1792 fits inside that. Measuring the column at 1280 —
    // 128px wider than anything on the page — was what wrongly pushed this
    // down to a 160px skyscraper, and a narrow rail then rendered a 1:2
    // creative at half the height it should be.
    expect(pickRail(1840, CONTENT)).toEqual({ format: 'halfpage', width: 300 });
  });

  it('steps down to a skyscraper when a half-page genuinely will not fit', () => {
    // 1152 + 2 × 320 = 1792 needed for a half-page; 1700 has room only for
    // 1152 + 2 × 180 = 1512.
    expect(pickRail(1700, CONTENT)).toEqual({ format: 'skyscraper', width: 160 });
  });

  it('gives up rather than overlapping when even the narrowest will not fit', () => {
    // 1152 + 2 × (160 + 20) = 1512 is the floor.
    expect(pickRail(1511, CONTENT)).toBeNull();
    expect(pickRail(1440, CONTENT)).toBeNull();
    expect(pickRail(1024, CONTENT)).toBeNull();
  });

  it('never picks a rail that would reach the content column', () => {
    for (const width of [1200, 1440, 1512, 1700, 1840, 1920, 2560]) {
      const rail = pickRail(width, CONTENT);
      if (!rail) continue;
      const spaceUsed = CONTENT + 2 * (rail.width + 20);
      expect(spaceUsed).toBeLessThanOrEqual(width);
    }
  });

  it('fits a rail into the tighter margin preview mode allows', () => {
    // Preview drops the gap so an admin can see the rails on a normal monitor.
    expect(pickRail(1472, CONTENT, 0)).toEqual({ format: 'skyscraper', width: 160 });
  });
});

describe('minimum section height', () => {
  it('is tall enough to contain a 600px rail and its offset', () => {
    // A section shorter than this cannot hold a rail: it would spill out of its
    // own box onto whatever follows — and an empty section (these podium
    // sections render null with no data) would stack its rails on the next
    // section's.
    expect(MIN_RAIL_SECTION_HEIGHT).toBeGreaterThanOrEqual(640);
  });
});

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

const CONTENT = 1280;

describe('pickRail', () => {
  it('uses a half-page when there is room for one', () => {
    // 1280 content + 2 × (300 + 20)
    expect(pickRail(1920, CONTENT)).toEqual({ format: 'halfpage', width: 300 });
  });

  it('steps down to a skyscraper on a Full-HD screen', () => {
    // A 1920px monitor leaves ~1840px once the desktop icon rail is taken off:
    // too narrow for a half-page, wide enough for a skyscraper. Stepping down
    // is what keeps rails on Full-HD without them clipping the section.
    const rail = pickRail(1840, CONTENT);
    expect(rail).toEqual({ format: 'skyscraper', width: 160 });
  });

  it('gives up rather than overlapping when even the narrowest will not fit', () => {
    // 1280 + 2 × (160 + 20) = 1640 is the floor.
    expect(pickRail(1639, CONTENT)).toBeNull();
    expect(pickRail(1440, CONTENT)).toBeNull();
    expect(pickRail(1024, CONTENT)).toBeNull();
  });

  it('never picks a rail that would reach the content column', () => {
    for (const width of [1200, 1440, 1640, 1700, 1840, 1920, 2560]) {
      const rail = pickRail(width, CONTENT);
      if (!rail) continue;
      const spaceUsed = CONTENT + 2 * (rail.width + 20);
      expect(spaceUsed).toBeLessThanOrEqual(width);
    }
  });

  it('fits a rail into the tighter margin preview mode allows', () => {
    // Preview drops the gap so an admin can see the rails on a normal monitor.
    expect(pickRail(1600, CONTENT, 0)).toEqual({ format: 'skyscraper', width: 160 });
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

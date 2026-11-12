import { describe, it, expect } from 'vitest';
import { BADGE_DELAY_S, DOCK_DELAY_S, revealTransition, seamShadeTransition } from './tabMotion';
import { LIST_CLOSE_MS, LIST_OPEN_MS } from './listCollapse';

describe('revealTransition', () => {
    it('grows the "Show list" pill only once the list has nearly docked', () => {
        expect(revealTransition(true, true, false)).toMatchObject({ type: 'spring', delay: DOCK_DELAY_S });
    });

    it('lets the count pop in just after the label', () => {
        expect(BADGE_DELAY_S).toBeGreaterThan(DOCK_DELAY_S);
        expect(revealTransition(true, true, false, BADGE_DELAY_S)).toMatchObject({ delay: BADGE_DELAY_S });
    });

    it('folds the pill away at once when the list comes back', () => {
        expect(revealTransition(false, true, false)).not.toHaveProperty('delay');
    });

    it('answers a hover at once', () => {
        expect(revealTransition(true, false, false)).not.toHaveProperty('delay');
        expect(revealTransition(false, false, false)).not.toHaveProperty('delay');
    });

    it('is instant under reduced motion, with no waiting', () => {
        for (const showing of [true, false]) {
            expect(revealTransition(showing, true, true)).toEqual({ duration: 0 });
        }
    });
});

describe('seamShadeTransition', () => {
    it('lasts exactly as long as the slide it shades', () => {
        expect(seamShadeTransition(true).duration).toBe(LIST_CLOSE_MS / 1000);
        expect(seamShadeTransition(false).duration).toBe(LIST_OPEN_MS / 1000);
    });

    it('peaks early and is gone by the end', () => {
        expect(seamShadeTransition(true).times).toEqual([0, 0.25, 1]);
    });
});

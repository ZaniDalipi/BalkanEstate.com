/**
 * The image budget: how much photo data a connection should be asked to carry.
 *
 * The rule under test in every case is the same one — an unknown connection is
 * a fast connection. Guessing "slow" degrades photos for every visitor on a
 * browser that simply does not ship the API (Safari, Firefox), which is the
 * larger half of mobile.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readImageBudget } from '../shared/hooks/useImageBudget';

const setConnection = (value: unknown) => {
    Object.defineProperty(navigator, 'connection', {
        value,
        configurable: true,
        writable: true,
    });
};

afterEach(() => {
    // jsdom has no `connection` of its own; leaving one behind would leak into
    // any test that reads it later.
    delete (navigator as Navigator & { connection?: unknown }).connection;
});

describe('readImageBudget', () => {
    it('is full when the browser has no Network Information API', () => {
        expect(readImageBudget()).toBe('full');
    });

    it('is lite when the visitor has asked for data saving', () => {
        setConnection({ saveData: true, effectiveType: '4g' });
        expect(readImageBudget()).toBe('lite');
    });

    it('is lite on 2G and 3G class connections', () => {
        for (const effectiveType of ['slow-2g', '2g', '3g']) {
            setConnection({ effectiveType });
            expect(readImageBudget()).toBe('lite');
        }
    });

    it('is full on 4G', () => {
        setConnection({ effectiveType: '4g' });
        expect(readImageBudget()).toBe('full');
    });

    it('is full when the API reports nothing useful', () => {
        setConnection({});
        expect(readImageBudget()).toBe('full');
    });

    it('is full when reading the connection throws', () => {
        // Privacy extensions replace `connection` with a throwing accessor.
        // One misbehaving API must not cost every visitor their photo quality.
        Object.defineProperty(navigator, 'connection', {
            get() {
                throw new Error('blocked');
            },
            configurable: true,
        });

        expect(readImageBudget()).toBe('full');
    });
});

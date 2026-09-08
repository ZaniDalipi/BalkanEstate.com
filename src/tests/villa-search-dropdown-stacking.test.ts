/**
 * The villas search suggestions paint over the results bar.
 *
 * The desktop header is `sticky` with a z-index, which makes it a stacking
 * context: every z-index inside it — including the suggestion list's — is
 * confined to the header's own layer. So when the header sat at z-20 and the
 * results bar below it at z-[100], the bar cut a white stripe through the
 * suggestions hanging down over it, hiding a whole row.
 *
 * The two never physically overlap (the bar sticks to the top of the scroll
 * container underneath the header), so nothing in the layout says these
 * numbers are related, and the next person to touch either has no reason to
 * suspect it. This is that reason.
 *
 * Paint order itself needs a real engine and was verified in a browser; what
 * is worth holding here is the ordering the fix depends on.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(
    path.resolve(__dirname, '../features/villas/components/VillaSearchPage.tsx'),
    'utf8',
);

/** Read a Tailwind z-index off the element carrying `marker`. */
const zIndexNear = (marker: string): number => {
    const at = SOURCE.indexOf(marker);
    expect(at, `"${marker}" is no longer in VillaSearchPage`).toBeGreaterThan(-1);

    // The rest of the class list the marker sits in, so a z-index further down
    // the file cannot stand in for one this element does not have.
    const classList = SOURCE.slice(at, SOURCE.indexOf('\n', at));
    const match = classList.match(/z-\[(\d+)\]|z-(\d+)(?![\w-])/);
    expect(match, `no z-index found near "${marker}"`).toBeTruthy();
    return Number(match![1] ?? match![2]);
};

describe('the villas search dropdown is not cut through by the results bar', () => {
    it('puts the header holding the search box above the results bar', () => {
        const header = zIndexNear('hidden lg:block sticky top-0');
        const resultsBar = zIndexNear('sticky top-0 bg-white border-b border-gray-100');

        expect(header).toBeGreaterThan(resultsBar);
    });

    it('still lifts the results bar over the cards that scroll under it', () => {
        expect(zIndexNear('sticky top-0 bg-white border-b border-gray-100')).toBeGreaterThan(0);
    });
});

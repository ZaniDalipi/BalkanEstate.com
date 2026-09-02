/**
 * Email CTA styling invariants
 *
 * A coloured button in these emails gets its text colour from the shared
 * `ec-*` stylesheet, which forces `.ec-card a { color: #000 !important }` so
 * body links stay readable on a white card. Two things must hold or every CTA
 * silently renders black-on-blue (light) / pale-blue-on-blue (dark):
 *
 *  1. every coloured button carries the `ec-cta` marker class, and
 *  2. the CTA rule outranks `.ec-card a` — `.ec-cta` alone (specificity 0-1-0)
 *     loses to `.ec-card a` (0-1-1) even with `!important`, so the selector
 *     list must include a qualified form such as `.ec-card a.ec-cta` (0-2-1).
 *
 * These are asserted against the source text: the bug was invisible in code
 * review and only showed up in a rendered mail client.
 */

import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');

/** Files whose emails are wrapped in the shared `ec-*` stylesheet. */
const EC_STYLED_FILES = [
  'services/emailService.ts',
  'utils/emailTemplateRenderer.ts',
];

const read = (relative: string) => fs.readFileSync(path.join(SRC, relative), 'utf8');

const ANCHOR = /<a\b[^>]*?>/gs;
const WHITE_TEXT = /color\s*:\s*(#fff(fff)?\b|white\b)/i;

interface Anchor {
  line: number;
  tag: string;
  style: string;
  className: string;
}

const anchorsWithColouredBackground = (source: string): Anchor[] => {
  const found: Anchor[] = [];
  for (const match of source.matchAll(ANCHOR)) {
    const tag = match[0];
    const style = /style\s*=\s*"([^"]*)"/s.exec(tag)?.[1] ?? '';
    if (!style.includes('background') || !WHITE_TEXT.test(style)) continue;
    found.push({
      line: source.slice(0, match.index).split('\n').length,
      tag,
      style,
      className: /class\s*=\s*"([^"]*)"/s.exec(tag)?.[1] ?? '',
    });
  }
  return found;
};

describe('Email CTA styling', () => {
  describe.each(EC_STYLED_FILES)('%s', relative => {
    const source = read(relative);

    it('marks every coloured button with ec-cta', () => {
      const unmarked = anchorsWithColouredBackground(source)
        .filter(a => !a.className.includes('ec-cta'))
        .map(a => `line ${a.line}: class="${a.className}"`);

      expect(unmarked).toEqual([]);
    });

    it('has at least one coloured button to protect', () => {
      expect(anchorsWithColouredBackground(source).length).toBeGreaterThan(0);
    });

    it('qualifies the CTA colour rule so it outranks .ec-card a', () => {
      const styleBlocks = [...source.matchAll(/<style>(.*?)<\/style>/gs)].map(m => m[1]);
      expect(styleBlocks.length).toBeGreaterThan(0);

      const unqualified = styleBlocks
        .map((block, index) => ({ block, index }))
        // Only blocks that actually force body links black need the counter-rule.
        .filter(({ block }) => /\.ec-card a\s*\{[^}]*color/.test(block))
        .filter(({ block }) => {
          const ctaRules = block.match(/[^{}]*\.ec-cta[^{}]*\{[^}]*\}/g) ?? [];
          // Every rule that sets the CTA's colour must carry a qualified selector.
          const colourRules = ctaRules.filter(rule => /color\s*:/.test(rule));
          return colourRules.length === 0
            || !colourRules.every(rule => rule.includes('.ec-card a.ec-cta'));
        })
        .map(({ index }) => `style block #${index + 1}`);

      expect(unqualified).toEqual([]);
    });

    it('never repaints a CTA background in dark mode, so brand colours survive', () => {
      // A blanket `.ec-cta { background: <blue> }` inside the dark-mode block
      // would turn every amber/emerald/purple button blue.
      const darkBlocks = [...source.matchAll(/@media \(prefers-color-scheme: dark\) \{(.*?)\n\s*\}\n/gs)]
        .map(m => m[1]);

      const repainting = darkBlocks
        .map((block, index) => ({ block, index }))
        .filter(({ block }) => /[^{}]*\.ec-cta[^{}]*\{[^}]*background/.test(block))
        .map(({ index }) => `dark block #${index + 1}`);

      expect(repainting).toEqual([]);
    });
  });

  it('keeps neutral chips dark-on-light rather than forcing white text', () => {
    // The welcome email's quick links sit on a light grey (#f3f4f6) pill; they
    // must NOT be marked as CTAs or their text would go white on light grey.
    const source = read('services/emailService.ts');
    const chips = [...source.matchAll(ANCHOR)]
      .map(m => m[0])
      .filter(tag => /background:\s*#f3f4f6/.test(tag));

    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(chip).not.toContain('ec-cta');
    }
  });
});

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { addDisclaimerCaption, resolveDisclaimerFontPath } from '../services/geminiService';

const REPO_ROOT = path.resolve(__dirname, '../../..');

/**
 * The AI-staging disclaimer is drawn onto every generated image by sharp's text
 * renderer, which needs a real font file. When one is missing the caption comes
 * out as a row of empty "tofu" boxes, so these tests guard both the font itself
 * and the packaging that has to carry it into the deployed image.
 */
describe('disclaimer caption', () => {
  it('resolves a font file that exists', () => {
    const fontPath = resolveDisclaimerFontPath();
    expect(fontPath).toBeDefined();
    expect(fs.existsSync(fontPath as string)).toBe(true);
    expect(fs.statSync(fontPath as string).size).toBeGreaterThan(10_000);
  });

  it('draws a caption bar without changing the image size', async () => {
    const width = 1400;
    const height = 1000;
    const base = await sharp({
      create: { width, height, channels: 3, background: { r: 190, g: 170, b: 140 } },
    }).png().toBuffer();

    const captioned = await addDisclaimerCaption(base);
    const meta = await sharp(captioned).metadata();
    expect(meta.width).toBe(width);
    expect(meta.height).toBe(height);

    // The top of the picture is untouched and the bottom strip is not: the bar
    // darkens it and the text draws light pixels on top.
    const strip = await sharp(captioned)
      .extract({ left: 0, top: height - 60, width, height: 60 })
      .raw()
      .toBuffer();
    const top = await sharp(captioned)
      .extract({ left: 0, top: 0, width, height: 60 })
      .raw()
      .toBuffer();

    const spread = (buf: Buffer) => {
      let min = 255;
      let max = 0;
      for (let i = 0; i < buf.length; i += 3) {
        min = Math.min(min, buf[i]);
        max = Math.max(max, buf[i]);
      }
      return max - min;
    };

    expect(spread(top)).toBe(0);
    // Dark bar + light glyphs — a blank or all-tofu strip would not span this far.
    expect(spread(strip)).toBeGreaterThan(100);
  });

  it('is shipped into both production images alongside dist', () => {
    for (const dockerfile of ['Dockerfile', 'backend/Dockerfile']) {
      const contents = fs.readFileSync(path.join(REPO_ROOT, dockerfile), 'utf8');
      expect(contents).toMatch(/COPY --from=\S+ \S*assets \.\/assets/);
    }
  });

  it('is copied into dist by the build, for hosts that deploy dist alone', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));
    expect(pkg.scripts.build).toContain('assets');
  });
});

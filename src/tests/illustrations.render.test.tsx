/**
 * The decorative pictures used across the app (3D icons, sidebar pictures,
 * category tiles) must never leave a broken-image glyph on the page: a file
 * that fails to load hides itself, keeping its box so nothing shifts.
 */

import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
    SoftIcon, NavPicture, CategoryPicture, SpecIllustration, softIconHtml,
    SOFT_ICONS, SPEC_ILLUSTRATIONS, NAV_PICTURES, CATEGORY_PICTURES,
    softIconUrl, specIllustrationUrl, navPictureUrl, categoryPictureUrl,
} from '@/src/shared/illustrations';

describe('decorative illustrations', () => {
    it('point at the generated and hand-made asset folders', () => {
        const { container } = render(
            <>
                <SoftIcon name="bed" />
                <NavPicture name="home" />
                <CategoryPicture name="luxury" />
                <SpecIllustration name="pool" />
            </>,
        );
        const srcs = [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'));
        expect(srcs).toEqual([
            '/images/illustrations/soft/bed.svg',
            '/images/illustrations/nav/home.webp',
            '/images/illustrations/categories/luxury.webp',
            '/images/illustrations/spec/pool.svg',
        ]);
    });

    it('are hidden from assistive technology', () => {
        const { container } = render(<SoftIcon name="bed" />);
        const img = container.querySelector('img')!;
        expect(img.getAttribute('alt')).toBe('');
        expect(img.getAttribute('aria-hidden')).toBe('true');
    });

    it('hide themselves, keeping their box, when the file fails to load', () => {
        const { container } = render(<NavPicture name="buy" className="w-6 h-6" />);
        const img = container.querySelector('img')!;
        expect(img.style.visibility).toBe('');
        fireEvent.error(img);
        expect(img.style.visibility).toBe('hidden');
        expect(img.className).toContain('w-6 h-6');
    });

    it('show again when pointed at a different file after a failure', () => {
        const { container, rerender } = render(<SoftIcon name="bed" />);
        fireEvent.error(container.querySelector('img')!);
        rerender(<SoftIcon name="bath" />);
        expect(container.querySelector('img')!.style.visibility).toBe('');
    });

    it('have a file on disk for every typed name', () => {
        const urls = [
            ...SOFT_ICONS.map(softIconUrl),
            ...SPEC_ILLUSTRATIONS.map(specIllustrationUrl),
            ...NAV_PICTURES.map(navPictureUrl),
            ...CATEGORY_PICTURES.map(categoryPictureUrl),
        ];
        const missing = urls.filter((url) => !existsSync(join(process.cwd(), 'public', url)));
        expect(missing).toEqual([]);
    });

    it('render as decorative markup for map popups', () => {
        const html = softIconHtml('ruler', 16);
        expect(html).toContain('src="/images/illustrations/soft/ruler.svg"');
        expect(html).toContain('alt=""');
        expect(html).toContain('aria-hidden="true"');
        expect(html).toContain("onerror=\"this.style.visibility='hidden'\"");
    });
});

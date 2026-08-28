/**
 * Listings with no uploaded photos.
 *
 * A property card must never borrow a stock house picture to fill the gap —
 * that shows buyers a building that is not the one for sale. The gap is filled
 * by a neutral "no photo available" placeholder instead, so these tests cover
 * both halves of the rule: the placeholder appears wherever an image is
 * missing or broken, and no stock default photo survives anywhere in config.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PropertyImage from '@/src/components/ui/PropertyImage';
import NoPhotoPlaceholder from '@/src/components/ui/NoPhotoPlaceholder';
import * as cloudinaryConfig from '@/config/cloudinaryConfig';

// The test setup mocks react-i18next so `t` echoes the key back.
const PLACEHOLDER_LABEL = 'property:photos.none';

const LOCALES = ['en', 'sq', 'sr', 'bs', 'hr', 'me', 'mk', 'bg', 'ro', 'el'];

describe('a listing without a photo', () => {
  it('shows the placeholder instead of an image', () => {
    render(<PropertyImage src={undefined} alt="Apartment in Tirana" />);

    expect(screen.getByRole('img', { name: PLACEHOLDER_LABEL })).toBeTruthy();
    expect(document.querySelectorAll('img').length).toBe(0);
  });

  it('shows the placeholder when an empty URL is passed', () => {
    render(<PropertyImage src="" alt="Apartment in Tirana" />);

    expect(screen.getByRole('img', { name: PLACEHOLDER_LABEL })).toBeTruthy();
  });

  it('falls back to the placeholder when the photo fails to load', () => {
    const { container } = render(
      <PropertyImage src="https://res.cloudinary.com/demo/image/upload/v1/gone.jpg" alt="Apartment in Tirana" />,
    );

    const mainImage = container.querySelector('img[alt="Apartment in Tirana"]');
    expect(mainImage).toBeTruthy();

    fireEvent.error(mainImage as HTMLImageElement);

    expect(screen.getByRole('img', { name: PLACEHOLDER_LABEL })).toBeTruthy();
    expect(document.querySelectorAll('img').length).toBe(0);
  });
});

describe('a listing with a photo', () => {
  it('renders the photo and no placeholder', () => {
    render(
      <PropertyImage src="https://res.cloudinary.com/demo/image/upload/v1/villa.jpg" alt="Villa in Budva" />,
    );

    expect(screen.getByAltText('Villa in Budva')).toBeTruthy();
    expect(screen.queryByRole('img', { name: PLACEHOLDER_LABEL })).toBeNull();
  });
});

describe('the placeholder itself', () => {
  it('keeps the caption out of the accessible name it already carries', () => {
    render(<NoPhotoPlaceholder size="lg" />);

    // One accessible node, not the label read twice (icon frame + caption).
    expect(screen.getAllByRole('img', { name: PLACEHOLDER_LABEL }).length).toBe(1);
  });

  it('drops the caption on thumbnail-sized placeholders', () => {
    render(<NoPhotoPlaceholder size="sm" />);

    const placeholder = screen.getByRole('img', { name: PLACEHOLDER_LABEL });
    expect(placeholder.textContent).toBe('');
  });
});

describe('no stock photo stands in for a missing listing photo', () => {
  it('exposes no default property image from the Cloudinary config', () => {
    expect('FALLBACK_IMAGES' in cloudinaryConfig).toBe(false);
  });

  it('keeps the retired stock house photo out of the source tree', () => {
    const configSource = fs.readFileSync(
      path.resolve(__dirname, '../../config/cloudinaryConfig.ts'),
      'utf-8',
    );

    expect(configSource).not.toContain('photo-1568605114967-8130f3a36994');
  });
});

describe('the placeholder caption', () => {
  it.each(LOCALES)('is translated for %s', (locale) => {
    const messages = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, `../i18n/locales/${locale}/property.json`), 'utf-8'),
    );

    expect(typeof messages.photos?.none).toBe('string');
    expect(messages.photos.none.length).toBeGreaterThan(0);
  });
});

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhonePanorama } from './PhonePanorama';
import { centeredScrollLeft } from './useCenteredScroll';
import { PHONE_CANVAS_WIDTH, canvasSize } from './canvasSize';

describe('centeredScrollLeft', () => {
  it('opens a wide picture on its middle', () => {
    expect(centeredScrollLeft(580, 390)).toBe(95);
  });
  it('stays at 0 when the picture fits', () => {
    expect(centeredScrollLeft(390, 390)).toBe(0);
    expect(centeredScrollLeft(300, 390)).toBe(0);
  });
});

describe('PhonePanorama', () => {
  it('on the page, lets the picture scroll sideways', () => {
    render(<PhonePanorama pictureKey="a" enabled><div>picture</div></PhonePanorama>);
    expect(screen.getByTestId('phone-panorama').className).toMatch(/max-sm:overflow-x-auto/);
    expect(screen.getByText('picture')).toBeInTheDocument();
  });
  it('in full screen, is a plain wrapper', () => {
    render(<PhonePanorama pictureKey="a" enabled={false}><div>picture</div></PhonePanorama>);
    expect(screen.queryByTestId('phone-panorama')).toBeNull();
    expect(screen.getByText('picture')).toBeInTheDocument();
  });
});

describe('phone picture size', () => {
  it('passes the picture ratio to the phone width rule, which never goes below the screen width', () => {
    expect(canvasSize(1600, 1000)).toMatchObject({ '--canvas-ratio': 1.6 });
    expect(PHONE_CANVAS_WIDTH).toContain('max(100%,');
    expect(canvasSize(1600, 1000, true)).not.toHaveProperty('--canvas-ratio');
  });
});

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoverImageUpload } from './CoverImageUpload';

vi.mock('../../hooks', () => ({ useUploadDevelopmentCover: () => ({ uploadCover: vi.fn(), isUploading: false }) }));

describe('CoverImageUpload', () => {
  it('shows the whole picture in a 16:9 frame, not a fixed-height crop', () => {
    render(<CoverImageUpload developmentId="d1" coverImage="https://media.example.test/cover.webp" />);
    const frame = screen.getByRole('button', { name: 'cover.upload' });
    expect(frame.className).toContain('aspect-video');
    expect(frame.className).not.toMatch(/\bh-44\b/);
    expect(frame.querySelector('img')?.className).toContain('object-contain');
  });

  it('stays a compact drop zone while there is no picture', () => {
    render(<CoverImageUpload developmentId="d1" />);
    const zone = screen.getByRole('button', { name: 'cover.upload' });
    expect(zone.className).toContain('h-44');
    expect(zone.querySelector('img')).toBeNull();
  });
});

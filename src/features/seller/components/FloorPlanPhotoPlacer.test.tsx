import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/src/tests/test-utils';
import FloorPlanPhotoPlacer from './FloorPlanPhotoPlacer';

const props = () => ({
  floors: [{ url: 'https://img.example/plan.jpg', label: 'Floor 1' }],
  photos: [{ url: 'https://img.example/a.jpg' }, { url: 'https://img.example/b.jpg' }],
  onSave: vi.fn(),
  onClose: vi.fn(),
});

describe('FloorPlanPhotoPlacer over a dialog', () => {
  it('closes itself on Esc without the dialog underneath hearing it', () => {
    const dialogKeys = vi.fn();
    document.addEventListener('keydown', dialogKeys);
    const p = props();
    render(<FloorPlanPhotoPlacer {...p} />);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(p.onClose).toHaveBeenCalledTimes(1);
    expect(dialogKeys).not.toHaveBeenCalled();
    document.removeEventListener('keydown', dialogKeys);
  });

  it('starts focus inside and keeps Tab there', () => {
    render(<FloorPlanPhotoPlacer {...props()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('puts back the scroll lock it found when it closes', () => {
    document.body.style.overflow = 'hidden';
    const { unmount } = render(<FloorPlanPhotoPlacer {...props()} />);
    unmount();
    expect(document.body.style.overflow).toBe('hidden');
    document.body.style.overflow = '';
  });
});

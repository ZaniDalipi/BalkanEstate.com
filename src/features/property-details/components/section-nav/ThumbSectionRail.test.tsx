import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ThumbSectionRail from './ThumbSectionRail';
import { useSectionNavPrefs } from './sectionNavStore';
import { readRailGeometry } from './railGeometry';
import type { NavSection } from './sectionDefs';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);
vi.mock('@/src/shared/illustrations', () => ({ SoftIcon: () => null }));

const sections: NavSection[] = [
  { key: 'top', labelKey: '', fallback: '', icon: 'info', label: 'Overview' },
  { key: 'details', labelKey: '', fallback: '', icon: 'clipboard', label: 'Details' },
  { key: 'neighborhood', labelKey: '', fallback: '', icon: 'houses', label: 'Neighborhood' },
  { key: 'air-quality', labelKey: '', fallback: '', icon: 'leaf', label: 'Air Quality' },
];

const pointer = (el: Element, type: 'pointerdown' | 'pointermove' | 'pointerup', y: number) =>
  act(() => {
    el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: 380, clientY: y, button: type === 'pointerdown' ? 0 : -1, pointerId: 1, pointerType: 'touch' }));
  });

/** In jsdom every rect is at 0, so row i spans [i·h, (i+1)·h). */
const rowY = (i: number) => readRailGeometry(sections.length).layout.rowHeight * i + 2;

const setup = () => {
  const onSelect = vi.fn();
  render(<ThumbSectionRail sections={sections} activeKey="top" overMap={false} onSelect={onSelect} />);
  return { onSelect, handle: screen.getByTestId('thumb-rail-handle') };
};

describe('ThumbSectionRail', () => {
  beforeEach(() => useSectionNavPrefs.setState({ side: 'right', visibility: 'always' }));

  it('jumps to the section the thumb slides to and lets go on', async () => {
    const { onSelect, handle } = setup();
    pointer(handle, 'pointerdown', rowY(0));
    expect(screen.getByRole('dialog', { name: 'On this page' })).toBeInTheDocument();
    pointer(handle, 'pointermove', rowY(1));
    pointer(handle, 'pointermove', rowY(2));
    pointer(handle, 'pointerup', rowY(2));
    expect(onSelect).toHaveBeenCalledWith('neighborhood');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes without jumping when the thumb lets go well away from the list', async () => {
    const { onSelect, handle } = setup();
    pointer(handle, 'pointerdown', rowY(1));
    pointer(handle, 'pointermove', 2000);
    pointer(handle, 'pointerup', 2000);
    expect(onSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('stays open after a tap so a row can be tapped', () => {
    const { onSelect, handle } = setup();
    pointer(handle, 'pointerdown', 300);
    pointer(handle, 'pointerup', 300);
    expect(handle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Air Quality' }));
    expect(onSelect).toHaveBeenCalledWith('air-quality');
  });

  it('closes on Escape and when tapping outside', async () => {
    const { handle } = setup();
    pointer(handle, 'pointerdown', 300);
    pointer(handle, 'pointerup', 300);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    pointer(handle, 'pointerdown', 300);
    pointer(handle, 'pointerup', 300);
    fireEvent.click(screen.getByTestId('thumb-rail-backdrop'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens from the keyboard', () => {
    const { handle } = setup();
    fireEvent.click(handle, { detail: 0 });
    expect(screen.getByRole('dialog', { name: 'On this page' })).toBeInTheDocument();
  });

  it('lets the reader move the rail to the left edge and tuck it away', () => {
    const { handle } = setup();
    fireEvent.click(handle, { detail: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Quick navigation' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Left' }));
    fireEvent.click(screen.getByRole('radio', { name: /Tucked away/ }));
    expect(useSectionNavPrefs.getState()).toMatchObject({ side: 'left', visibility: 'hidden' });
    expect(screen.getByRole('radio', { name: 'Left' })).toHaveAttribute('aria-checked', 'true');
    // Remembered on the device (localStorage is a stub in tests: check what was written).
    const writes = vi.mocked(localStorage.setItem).mock.calls.filter(([name]) => name === 'section-nav-prefs');
    expect(JSON.parse(writes[writes.length - 1][1]).state).toEqual({ side: 'left', visibility: 'hidden' });
  });

  it('never lets a long press on the rail start selecting the page (iOS)', async () => {
    const { handle } = setup();
    const touch = new Event('touchstart', { bubbles: true, cancelable: true });
    handle.dispatchEvent(touch);
    expect(touch.defaultPrevented).toBe(true);

    pointer(handle, 'pointerdown', 300);
    expect(document.documentElement).toHaveClass('thumb-rail-no-select');
    const select = new Event('selectstart', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(select);
    expect(select.defaultPrevented).toBe(true);

    pointer(handle, 'pointerup', 300);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(document.documentElement).not.toHaveClass('thumb-rail-no-select'));
    const later = new Event('selectstart', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(later);
    expect(later.defaultPrevented).toBe(false);
  });

  it('steps aside over the 3D map', () => {
    const onSelect = vi.fn();
    render(<ThumbSectionRail sections={sections} activeKey="top" overMap onSelect={onSelect} />);
    expect(screen.getByTestId('thumb-rail-handle')).toHaveAttribute('tabindex', '-1');
  });
});

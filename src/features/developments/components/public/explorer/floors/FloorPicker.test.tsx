import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FloorPicker } from './FloorPicker';
import type { FloorStop } from './floorStack';

vi.mock('react-i18next', async () => (await import('../__tests__/i18nMock')).default);

const stops: FloorStop[] = [
  { id: 'f2', label: 'Floor 2', level: 2, units: 3, available: 1, hasPicture: false },
  { id: 'f1', label: 'Floor 1', level: 1, units: 3, available: 2, hasPicture: true },
  { id: 'f0', label: 'Ground floor', level: 0, units: 0, available: 0, hasPicture: false },
];

const mount = (activeId?: string) => {
  const onSelect = vi.fn();
  const onPreview = vi.fn();
  render(<FloorPicker stops={stops} activeId={activeId} onSelect={onSelect} onPreview={onPreview} layout="column" />);
  return { nav: screen.getByRole('navigation', { name: 'Floors' }), onSelect, onPreview };
};

describe('FloorPicker', () => {
  it('lists the whole building, then every floor top first, with what is free and which have a plan', () => {
    const { nav } = mount();
    const buttons = within(nav).getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Whole building', 'Floor 2, 1 available', 'Floor 1, 2 available', 'Ground floor']);
    // Closed, the column shows each floor's number.
    expect(buttons.slice(1).map((b) => b.textContent?.slice(0, 1))).toEqual(['2', '1', '0']);
    expect(within(buttons[2]).getByRole('img', { name: 'Has a floor plan' })).toBeInTheDocument();
    expect(within(buttons[1]).queryByRole('img')).not.toBeInTheDocument();
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens the floor chosen, and comes back out to the whole building', () => {
    const { nav, onSelect } = mount('f1');
    expect(within(nav).getByRole('button', { name: /Floor 1/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(nav).getByRole('button', { name: 'Whole building' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(within(nav).getByRole('button', { name: /Floor 2/ }));
    expect(onSelect).toHaveBeenLastCalledWith('f2');
    fireEvent.click(within(nav).getByRole('button', { name: 'Whole building' }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('lights a floor up while a mouse points at it or the keyboard is on it, not on a touch', () => {
    const { nav, onPreview } = mount();
    const floor1 = within(nav).getByRole('button', { name: /Floor 1/ });
    fireEvent.pointerEnter(floor1, { pointerType: 'touch' });
    expect(onPreview).not.toHaveBeenCalled();
    fireEvent.pointerEnter(floor1, { pointerType: 'mouse' });
    expect(onPreview).toHaveBeenLastCalledWith('f1');
    fireEvent.pointerLeave(nav);
    expect(onPreview).toHaveBeenLastCalledWith(null);
    fireEvent.focus(floor1);
    expect(onPreview).toHaveBeenLastCalledWith('f1');
    fireEvent.blur(floor1);
    expect(onPreview).toHaveBeenLastCalledWith(null);
  });

  it('names each chip in the row on phones', () => {
    render(<FloorPicker stops={stops} onSelect={vi.fn()} onPreview={vi.fn()} layout="row" />);
    const row = screen.getByRole('navigation', { name: 'Floors' });
    expect(within(row).getByRole('button', { name: 'Floor 1, 2 available' })).toHaveTextContent('Floor 12 available');
  });

  it('shows nothing for a building without floors to choose', () => {
    const { container } = render(<FloorPicker stops={[]} onSelect={vi.fn()} onPreview={vi.fn()} layout="row" />);
    expect(container).toBeEmptyDOMElement();
  });
});

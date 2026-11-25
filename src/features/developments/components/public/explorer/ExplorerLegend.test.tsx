import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ExplorerLegend } from './ExplorerLegend';

vi.mock('react-i18next', async () => (await import('./__tests__/i18nMock')).default);

const counts = [
  { state: 'available' as const, count: 60 },
  { state: 'reserved' as const, count: 20 },
  { state: 'sold' as const, count: 19 },
];

const setup = (layout?: 'grid' | 'inline') => {
  const onToggle = vi.fn();
  const onToggleShowAvailability = vi.fn();
  render(
    <ExplorerLegend
      counts={counts}
      selected={['available']}
      onToggle={onToggle}
      showAvailability={false}
      onToggleShowAvailability={onToggleShowAvailability}
      layout={layout}
    />
  );
  return { onToggle, onToggleShowAvailability, group: screen.getByRole('group', { name: 'Availability legend' }) };
};

describe('ExplorerLegend', () => {
  it('on phones, lays the switch out as a full-width row above an even grid of states', () => {
    const { group, onToggle, onToggleShowAvailability } = setup('grid');
    expect(group.className).toMatch(/\bgrid\b/);
    const sw = within(group).getByRole('switch', { name: 'Show availability' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(sw.className).toMatch(/col-span-full/);
    fireEvent.click(sw);
    expect(onToggleShowAvailability).toHaveBeenCalledTimes(1);

    // Each state is a filter toggle showing its name and count.
    const reserved = within(group).getByRole('button', { name: /Reserved\s*20/ });
    expect(reserved).toHaveAttribute('aria-pressed', 'false');
    expect(within(group).getByRole('button', { name: /Available\s*60/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(reserved);
    expect(onToggle).toHaveBeenCalledWith('reserved');
  });

  it('over the picture, keeps compact wrapping pills', () => {
    const { group } = setup();
    expect(group.className).toMatch(/\bflex\b/);
    expect(group.className).not.toMatch(/\bgrid\b/);
    expect(within(group).getByRole('switch').className).not.toMatch(/col-span-full/);
  });
});

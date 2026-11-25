import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StageTopBar } from './StageTopBar';

vi.mock('react-i18next', async () => (await import('./__tests__/i18nMock')).default);

const base = {
  onCrumb: vi.fn(),
  filtersOpen: false,
  onToggleFilters: vi.fn(),
  activeFilters: false,
  fullscreen: false,
  onToggleFullscreen: vi.fn(),
};
const residence = { key: 'r', label: 'East Gate Living' };

describe('StageTopBar', () => {
  it('docked at the top level, tells a phone visitor what to do instead of repeating the residence name', () => {
    render(<StageTopBar {...base} docked crumbs={[residence]} />);
    expect(screen.getByText('Swipe to look around · tap a building to explore')).toBeInTheDocument();
    // The name stays for tablet and up, hidden on phones.
    expect(screen.getByText('East Gate Living').closest('.hidden')).not.toBeNull();
  });

  it('docked inside a building, offers the way back', () => {
    const onCrumb = vi.fn();
    render(<StageTopBar {...base} onCrumb={onCrumb} docked crumbs={[residence, { key: 'b', label: 'Tower 1' }]} />);
    expect(screen.queryByText('Swipe to look around · tap a building to explore')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: /East Gate Living/ })[0]);
    expect(onCrumb).toHaveBeenCalledWith(0);
  });

  it('floating over the picture (full screen), shows no hint', () => {
    render(<StageTopBar {...base} fullscreen crumbs={[residence]} />);
    expect(screen.queryByText(/Swipe to look around/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeInTheDocument();
  });
});

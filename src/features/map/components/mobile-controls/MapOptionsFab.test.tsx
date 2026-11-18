import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MapOptionsFab from './MapOptionsFab';
import { useMapOptionsDiscovery } from './useMapOptionsDiscovery';
import { MAP_OPTIONS_SEEN_KEY, resetMapOptionsMemory } from '../../utils/mapOptionsSeen';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : k) }),
}));

/** The test setup stubs localStorage with bare mocks; back them with a real map here. */
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  resetMapOptionsMemory();
  vi.mocked(localStorage.getItem).mockImplementation((k: string) => store.get(k) ?? null);
  vi.mocked(localStorage.setItem).mockImplementation((k: string, v: string) => void store.set(k, v));
});

const Harness: React.FC<{ onOpen: () => void; count?: number }> = ({ onOpen, count = 0 }) => {
  const discovery = useMapOptionsDiscovery();
  return (
    <>
      <MapOptionsFab
        onOpen={() => { discovery.markOpened(); onOpen(); }}
        isSheetOpen={false}
        activeLayerCount={count}
        isNew={discovery.isNew}
      />
      <span data-testid="new">{String(discovery.isNew)}</span>
    </>
  );
};

describe('MapOptionsFab', () => {
  it('says what it holds and opens the options', () => {
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    expect(screen.getByText('Map Options')).toBeTruthy();
    expect(screen.getByText('Style, climate & layers')).toBeTruthy();
    const fab = screen.getByRole('button', { name: 'Map Options: Style, climate & layers' });
    expect(fab.getAttribute('aria-haspopup')).toBe('dialog');
    fireEvent.click(fab);
    expect(onOpen).toHaveBeenCalled();
  });

  it('shows how many layers are on', () => {
    render(<Harness onOpen={vi.fn()} count={3} />);
    expect(screen.getByRole('button', { name: 'Map Options: Style, climate & layers (3)' })).toBeTruthy();
  });

  it('draws attention until opened once, then remembers it', () => {
    const { unmount } = render(<Harness onOpen={vi.fn()} />);
    expect(screen.getByTestId('new').textContent).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /Map Options/ }));
    expect(screen.getByTestId('new').textContent).toBe('false');
    expect(store.get(MAP_OPTIONS_SEEN_KEY)).toBe('1');
    unmount();
    resetMapOptionsMemory();
    render(<Harness onOpen={vi.fn()} />);
    expect(screen.getByTestId('new').textContent).toBe('false');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import LayersHint from './LayersHint';
import { useLayersHint, HINT_DELAY_MS, HINT_VISIBLE_MS } from './useLayersHint';
import { LAYERS_HINT_KEY, resetLayersHintMemory } from '../../utils/layersHintStorage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : k) }),
}));

const TIP = 'Map style, climate risks and layers are here';

const Harness: React.FC = () => {
  const [open, setOpen] = useState(false);
  const hint = useLayersHint(open);
  return (
    <>
      <AnimatePresence>{hint.visible && <LayersHint onOpen={() => setOpen(true)} onDismiss={hint.dismiss} />}</AnimatePresence>
      <span data-testid="sheet">{open ? 'open' : 'closed'}</span>
    </>
  );
};

/** The test setup stubs localStorage with bare mocks; back them with a real map here. */
const store = new Map<string, string>();
const stubStorage = () => {
  store.clear();
  vi.mocked(localStorage.getItem).mockImplementation((k: string) => store.get(k) ?? null);
  vi.mocked(localStorage.setItem).mockImplementation((k: string, v: string) => void store.set(k, v));
  vi.mocked(localStorage.clear).mockImplementation(() => store.clear());
};

describe('Layers hint', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubStorage();
    resetLayersHintMemory();
  });
  afterEach(() => vi.useRealTimers());

  it('appears once on the first visit and opens the sheet when tapped', () => {
    render(<Harness />);
    expect(screen.queryByText(TIP)).toBeNull();
    act(() => vi.advanceTimersByTime(HINT_DELAY_MS));
    fireEvent.click(screen.getByText(TIP));
    expect(screen.getByTestId('sheet').textContent).toBe('open');
    expect(localStorage.getItem(LAYERS_HINT_KEY)).toBe('1');
  });

  it('can be dismissed, and goes away on its own', () => {
    const { unmount } = render(<Harness />);
    act(() => vi.advanceTimersByTime(HINT_DELAY_MS));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(localStorage.getItem(LAYERS_HINT_KEY)).toBe('1');
    unmount();

    localStorage.clear();
    resetLayersHintMemory();
    render(<Harness />);
    act(() => vi.advanceTimersByTime(HINT_DELAY_MS));
    expect(screen.getByText(TIP)).toBeTruthy();
    act(() => vi.advanceTimersByTime(HINT_VISIBLE_MS));
    expect(localStorage.getItem(LAYERS_HINT_KEY)).toBe('1');
  });

  it('does not come back once seen', () => {
    localStorage.setItem(LAYERS_HINT_KEY, '1');
    render(<Harness />);
    act(() => vi.advanceTimersByTime(HINT_DELAY_MS * 3));
    expect(screen.queryByText(TIP)).toBeNull();
  });
});

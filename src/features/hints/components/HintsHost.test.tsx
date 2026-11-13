import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import HintsHost from './HintsHost';
import { useHintsStore } from '../hooks/hintsStore';
import { HINT_DELAY_MS, HINT_RETRY_MS, HINT_VISIBLE_MS } from '../hooks/useAutoHint';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

const route = vi.hoisted(() => ({ value: { view: 'search', detail: 'property', pageKey: 'search:p1', params: {}, scrollKey: '' } }));
vi.mock('@/src/app/router/useRouteView', () => ({ useRouteView: () => route.value }));

const setTouch = (touch: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: touch && q === '(pointer: coarse)',
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};

beforeEach(() => {
  vi.useFakeTimers();
  setTouch(true);
  useHintsStore.setState({ enabled: true, seen: [], lastShownAt: null, shownThisVisit: 0, currentId: null, panelOpen: false });
});
afterEach(() => vi.useRealTimers());

const agentTip = /hold the agent's photo/i;

describe('HintsHost', () => {
  it('shows the agent tip a few seconds after a listing opens, then hides it on its own', () => {
    render(<HintsHost />);
    expect(screen.queryByTestId('hint-toast')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(HINT_DELAY_MS); });
    expect(screen.getByTestId('hint-toast')).toHaveTextContent(agentTip);
    act(() => { vi.advanceTimersByTime(HINT_VISIBLE_MS); });
    expect(useHintsStore.getState().currentId).toBeNull();
  });

  it('does not show the same tip again', () => {
    useHintsStore.setState({ seen: ['agentHold'] });
    render(<HintsHost />);
    act(() => { vi.advanceTimersByTime(HINT_DELAY_MS); });
    expect(screen.getByTestId('hint-toast')).not.toHaveTextContent(agentTip);
  });

  it('opens all tips from the tip, lists this page first, and turns automatic tips off', () => {
    render(<HintsHost />);
    act(() => { vi.advanceTimersByTime(HINT_DELAY_MS); });
    fireEvent.click(screen.getByText(agentTip));
    const panel = screen.getByRole('dialog', { name: 'Tips' });
    expect(panel).toHaveTextContent('On this page');
    expect(panel).toHaveTextContent(agentTip);
    const toggle = screen.getByRole('switch', { name: 'Show a tip now and then' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(toggle);
    expect(useHintsStore.getState().enabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Close tips' }));
    expect(useHintsStore.getState().panelOpen).toBe(false);
  });

  it('closes the panel with Esc', () => {
    useHintsStore.setState({ panelOpen: true });
    render(<HintsHost />);
    expect(screen.getByRole('dialog', { name: 'Tips' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useHintsStore.getState().panelOpen).toBe(false);
  });

  it('hides a tip with its close button', () => {
    render(<HintsHost />);
    act(() => { vi.advanceTimersByTime(HINT_DELAY_MS); });
    fireEvent.click(screen.getByRole('button', { name: 'Hide tip' }));
    expect(useHintsStore.getState().currentId).toBeNull();
  });

  it('stays quiet when tips are off', () => {
    useHintsStore.setState({ enabled: false });
    render(<HintsHost />);
    act(() => { vi.advanceTimersByTime(HINT_DELAY_MS); });
    expect(screen.queryByTestId('hint-toast')).not.toBeInTheDocument();
  });

  it('waits while another dialog (a cookie banner) is open', () => {
    const banner = document.createElement('div');
    banner.setAttribute('role', 'dialog');
    banner.getClientRects = () => [{}] as unknown as DOMRectList;
    document.body.appendChild(banner);
    render(<HintsHost />);
    act(() => { vi.advanceTimersByTime(HINT_DELAY_MS); });
    expect(screen.queryByTestId('hint-toast')).not.toBeInTheDocument();
    expect(useHintsStore.getState().seen).toEqual([]);
    banner.remove();
    act(() => { vi.advanceTimersByTime(HINT_RETRY_MS); });
    expect(screen.getByTestId('hint-toast')).toHaveTextContent(agentTip);
  });
});

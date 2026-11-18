import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import DrawLoginGate from './DrawLoginGate';
import { useDrawLoginGate } from './useDrawLoginGate';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : k) }),
}));

const app = { state: { isAuthModalOpen: false }, dispatch: vi.fn() };
vi.mock('@/context/AppContext', () => ({ useAppContext: () => app }));

const Harness: React.FC<{ isAuthenticated: boolean; isDrawing?: boolean; onDrawStart: () => void }> = ({
  isAuthenticated, isDrawing = false, onDrawStart,
}) => {
  const gate = useDrawLoginGate({ isDrawing, isAuthenticated, onDrawStart });
  return (
    <>
      <button type="button" onClick={gate.requestDraw}>Draw</button>
      <DrawLoginGate gate={gate} />
    </>
  );
};

describe('Draw login gate', () => {
  beforeEach(() => {
    app.state.isAuthModalOpen = false;
    app.dispatch.mockReset();
  });

  it('lets a logged-in user draw straight away', () => {
    const onDrawStart = vi.fn();
    render(<Harness isAuthenticated onDrawStart={onDrawStart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }));
    expect(onDrawStart).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('asks a logged-out user to log in, then draws once they have', () => {
    const onDrawStart = vi.fn();
    const { rerender } = render(<Harness isAuthenticated={false} onDrawStart={onDrawStart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }));
    expect(onDrawStart).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Log in to save your area' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
    expect(app.dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });

    app.state.isAuthModalOpen = true;
    rerender(<Harness isAuthenticated={false} onDrawStart={onDrawStart} />);
    act(() => {
      rerender(<Harness isAuthenticated onDrawStart={onDrawStart} />);
    });
    expect(onDrawStart).toHaveBeenCalledTimes(1);
  });

  it('can draw without saving, and is not asked again', () => {
    const onDrawStart = vi.fn();
    render(<Harness isAuthenticated={false} onDrawStart={onDrawStart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }));
    fireEvent.click(screen.getByRole('button', { name: 'Draw Without Saving' }));
    expect(onDrawStart).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }));
    expect(onDrawStart).toHaveBeenCalledTimes(2);
  });

  it('cancel and Esc close the prompt without drawing', () => {
    const onDrawStart = vi.fn();
    render(<Harness isAuthenticated={false} onDrawStart={onDrawStart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDrawStart).not.toHaveBeenCalled();
    expect(app.dispatch).not.toHaveBeenCalled();
  });

  it('does not start drawing when the login dialog was closed without logging in', () => {
    const onDrawStart = vi.fn();
    const { rerender } = render(<Harness isAuthenticated={false} onDrawStart={onDrawStart} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }));
    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
    app.state.isAuthModalOpen = true;
    rerender(<Harness isAuthenticated={false} onDrawStart={onDrawStart} />);
    vi.useFakeTimers();
    app.state.isAuthModalOpen = false;
    rerender(<Harness isAuthenticated={false} onDrawStart={onDrawStart} />);
    vi.advanceTimersByTime(60_000);
    rerender(<Harness isAuthenticated onDrawStart={onDrawStart} />);
    vi.useRealTimers();
    expect(onDrawStart).not.toHaveBeenCalled();
  });
});

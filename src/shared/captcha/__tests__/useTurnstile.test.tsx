import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import TurnstileWidget from '../TurnstileWidget';
import { useTurnstile } from '../useTurnstile';
import { isCaptchaError, turnstileHeaders } from '../turnstileConfig';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);

type RenderOptions = Parameters<NonNullable<Window['turnstile']>['render']>[1];
let lastOptions: RenderOptions | null = null;
const api = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };

beforeEach(() => {
  lastOptions = null;
  api.render.mockReset().mockImplementation((_el: HTMLElement, opts: RenderOptions) => { lastOptions = opts; return 'w1'; });
  api.reset.mockReset();
  api.remove.mockReset();
  window.turnstile = api;
});
afterEach(() => { delete window.turnstile; });

describe('turnstileConfig', () => {
  it('builds the header only when there is a token', () => {
    expect(turnstileHeaders('abc')).toEqual({ 'X-Turnstile-Token': 'abc' });
    expect(turnstileHeaders(null)).toEqual({});
  });
  it('recognises captcha refusals', () => {
    expect(isCaptchaError({ code: 'captcha_failed' })).toBe(true);
    expect(isCaptchaError({ code: 'other' })).toBe(false);
    expect(isCaptchaError(null)).toBe(false);
  });
});

describe('useTurnstile', () => {
  it('never blocks and sends no header when no site key is configured', () => {
    const { result } = renderHook(() => useTurnstile('x', ''));
    expect(result.current.enabled).toBe(false);
    expect(result.current.blockReason()).toBeNull();
    expect(result.current.headers).toEqual({});
  });

  it('blocks until a token arrives, then sends it; reset asks for a fresh one', () => {
    const { result } = renderHook(() => useTurnstile('contact', 'site-key'));
    expect(result.current.blockReason()).toMatch(/security check/);

    act(() => result.current.widgetProps.onToken('tok-1'));
    expect(result.current.blockReason()).toBeNull();
    expect(result.current.headers).toEqual({ 'X-Turnstile-Token': 'tok-1' });

    act(() => result.current.reset());
    expect(result.current.token).toBeNull();
    expect(result.current.widgetProps.resetCount).toBe(1);
  });

  it('explains a script that failed to load', () => {
    const { result } = renderHook(() => useTurnstile('contact', 'site-key'));
    act(() => result.current.widgetProps.onLoadError());
    expect(result.current.blockReason()).toMatch(/could not load/);
  });

  it('translates only captcha errors', () => {
    const { result } = renderHook(() => useTurnstile('contact', 'site-key'));
    expect(result.current.errorMessage({ code: 'captcha_required' })).toMatch(/failed/);
    expect(result.current.errorMessage(new Error('x'))).toBeNull();
  });
});

describe('TurnstileWidget', () => {
  it('renders nothing without a site key', () => {
    render(<TurnstileWidget siteKey="" resetCount={0} onToken={vi.fn()} onLoadError={vi.fn()} />);
    expect(screen.queryByTestId('turnstile-widget')).toBeNull();
    expect(api.render).not.toHaveBeenCalled();
  });

  it('renders invisibly, reports tokens and expiry, resets and cleans up', async () => {
    const onToken = vi.fn();
    const { rerender, unmount } = render(
      <TurnstileWidget siteKey="k" action="contact" resetCount={0} onToken={onToken} onLoadError={vi.fn()} />
    );
    await waitFor(() => expect(api.render).toHaveBeenCalledTimes(1));
    expect(lastOptions).toMatchObject({ sitekey: 'k', action: 'contact', appearance: 'interaction-only' });

    lastOptions!.callback!('tok');
    lastOptions!['expired-callback']!();
    expect(onToken.mock.calls).toEqual([['tok'], [null]]);

    rerender(<TurnstileWidget siteKey="k" action="contact" resetCount={1} onToken={onToken} onLoadError={vi.fn()} />);
    expect(api.reset).toHaveBeenCalledWith('w1');

    unmount();
    expect(api.remove).toHaveBeenCalledWith('w1');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import PropertyInquiryModal from '../components/PropertyInquiryModal';
import type { Property } from '@/types';

vi.mock('react-i18next', async () => (await import('@/src/features/developments/components/public/explorer/__tests__/i18nMock')).default);
vi.mock('@/context/AppContext', () => ({ useAppContext: () => ({ state: { currentUser: null } }) }));
const api = vi.hoisted(() => ({ sendPropertyInquiry: vi.fn() }));
vi.mock('@/services/apiService', () => api);
// Captcha switched on, as in production with VITE_TURNSTILE_SITE_KEY set.
vi.mock('@/src/shared/captcha/turnstileConfig', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/shared/captcha/turnstileConfig')>()),
  TURNSTILE_SITE_KEY: 'test-site-key',
}));

const property = { id: 'p1', title: 'Sea view flat', city: 'Budva', country: 'Montenegro', price: 100000, images: [] } as unknown as Property;
let issueToken: ((token: string) => void) | null = null;

beforeEach(() => {
  api.sendPropertyInquiry.mockReset().mockResolvedValue({ message: 'ok', recipient: 'Agent' });
  window.localStorage.clear();
  issueToken = null;
  window.turnstile = {
    render: vi.fn((_el, opts) => { issueToken = opts.callback ?? null; return 'w1'; }),
    reset: vi.fn(),
    remove: vi.fn(),
  };
});
afterEach(() => { delete window.turnstile; });

const fillAndSubmit = () => {
  fireEvent.change(screen.getByLabelText(/Your Name/), { target: { value: 'Ana Buyer' } });
  fireEvent.change(screen.getByLabelText(/Your Email/), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText(/Your Message/), { target: { value: 'Is it available?' } });
  fireEvent.click(screen.getByRole('button', { name: /send/i }));
};

describe('PropertyInquiryModal with Turnstile', () => {
  it('waits for the security check, then sends its token in the header', async () => {
    render(<PropertyInquiryModal property={property} isOpen onClose={() => undefined} />);
    await waitFor(() => expect(window.turnstile!.render).toHaveBeenCalled());

    fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/security check/);
    expect(api.sendPropertyInquiry).not.toHaveBeenCalled();

    act(() => issueToken!('tok-123'));
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(api.sendPropertyInquiry).toHaveBeenCalledTimes(1));
    expect(api.sendPropertyInquiry.mock.calls[0][1]).toEqual({ 'X-Turnstile-Token': 'tok-123' });
    // The success screen replaces the form, so the widget is removed.
    await waitFor(() => expect(window.turnstile!.remove).toHaveBeenCalledWith('w1'));
  });

  it('explains a refused check from the server', async () => {
    api.sendPropertyInquiry.mockRejectedValue(Object.assign(new Error('nope'), { code: 'captcha_failed' }));
    render(<PropertyInquiryModal property={property} isOpen onClose={() => undefined} />);
    await waitFor(() => expect(window.turnstile!.render).toHaveBeenCalled());
    act(() => issueToken!('tok-1'));
    fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent(/security check failed/);
    // Tokens are single-use: the form asks for a fresh one for the next try.
    await waitFor(() => expect(window.turnstile!.reset).toHaveBeenCalledWith('w1'));
  });
});

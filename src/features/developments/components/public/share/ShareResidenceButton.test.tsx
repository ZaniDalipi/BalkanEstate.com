import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareResidenceButton } from './ShareResidenceButton';

vi.mock('react-i18next', async () => (await import('../explorer/__tests__/i18nMock')).default);
vi.mock('@/src/shared/api/config', () => ({ API_URL: 'https://api.test/api' }));
vi.mock('@/src/utils/languageRouting', () => ({ getCurrentLanguageFromUrl: () => 'sq' }));
vi.mock('@/src/components/marketing/SocialShare', () => ({
  SocialShare: ({ url, title }: { url: string; title: string }) => <p data-testid="social">{`${title} | ${url}`}</p>,
}));

const nav = navigator as unknown as { share?: unknown };
afterEach(() => {
  delete nav.share;
  vi.unstubAllGlobals();
});

const renderIt = () => render(<ShareResidenceButton slug="plaza" name="Plaza" place="Tirana, Albania" />);

describe('ShareResidenceButton', () => {
  it('on a computer opens a window with the preview card and the links', async () => {
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    const img = await screen.findByRole('img', { name: /Plaza with its buildings marked/ });
    expect(img).toHaveAttribute('src', 'https://api.test/api/og/residence/plaza/image.jpg?lang=sq');
    expect(screen.getByTestId('social')).toHaveTextContent(`Plaza – new homes in Tirana, Albania | ${window.location.origin}/sq/developments/plaza`);
  });

  it('on a phone uses the share sheet, and cancelling it opens nothing', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('cancel'), { name: 'AbortError' }));
    nav.share = share;
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('coarse'), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    renderIt();
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: 'Plaza', text: 'Plaza – new homes in Tirana, Albania', url: `${window.location.origin}/sq/developments/plaza` }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

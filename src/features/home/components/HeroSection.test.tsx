import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import HeroSection from './HeroSection';
import en from '@/src/i18n/locales/en/home.json';
import hr from '@/src/i18n/locales/hr/home.json';
import ro from '@/src/i18n/locales/ro/home.json';

const h = vi.hoisted(() => ({ total: 55 as number | Error }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => (opts?.count === undefined ? key : `${key}:${opts.count}`),
    i18n: { language: 'en' },
  }),
}));
vi.mock('@/src/shared/api', () => ({
  apiRequest: (url: string) => {
    if (h.total instanceof Error) return Promise.reject(h.total);
    return Promise.resolve(url.startsWith('/properties') ? { pagination: { total: h.total } } : { total: 3 });
  },
}));
vi.mock('@/src/features/search/universal/useUniversalSearch', () => ({
  useUniversalSearch: () => ({ groups: [], suggestions: [], isSearching: false, resolvePlace: vi.fn() }),
}));
vi.mock('@/src/components/ui/typewriter', () => ({ Typewriter: () => null }));

const renderHero = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <HeroSection searchQuery="" onSearchChange={vi.fn()} onSearch={vi.fn()} onNavigate={vi.fn()} />
    </QueryClientProvider>,
  );

describe('HeroSection subtitle', () => {
  it('states the real number of active listings once it is known', async () => {
    h.total = 55;
    renderHero();
    expect(await screen.findByText('home:hero.subtitleCount:55')).toBeInTheDocument();
  });

  it('claims no number while the count is missing or zero', async () => {
    h.total = new Error('down');
    renderHero();
    expect(screen.getByText('home:hero.subtitle')).toBeInTheDocument();
    h.total = 0;
    renderHero();
    expect(screen.getAllByText('home:hero.subtitle')).toHaveLength(2);
  });

  it('has plural forms that read correctly in each grammar', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({ lng: 'en', resources: { en: { home: en }, hr: { home: hr }, ro: { home: ro } } });
    const say = (lng: string, count: number) => i18n.getFixedT(lng, 'home')('hero.subtitleCount', { count });
    expect(say('en', 1)).toMatch(/^Discover 1 property across/);
    expect(say('en', 55)).toMatch(/^Discover 55 properties across/);
    expect(say('hr', 52)).toMatch(/^Otkrijte 52 nekretnine /);
    expect(say('hr', 55)).toMatch(/^Otkrijte 55 nekretnina /);
    expect(say('ro', 55)).toMatch(/^Descoperă 55 de proprietăți /);
  });
});

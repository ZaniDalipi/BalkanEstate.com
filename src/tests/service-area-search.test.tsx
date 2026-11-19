import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/shared/places', () => ({
  fetchPlacePredictions: vi.fn().mockResolvedValue([]),
  resolvePlaceDetails: vi.fn().mockResolvedValue(null),
  isPlacesAvailable: () => false,
  createSessionToken: () => 'token',
}));

vi.mock('@/services/osmService', () => ({
  searchLocation: vi.fn().mockResolvedValue([]),
  reverseGeocode: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: string | { defaultValue?: string; area?: string }) => {
      if (typeof opts === 'string') return opts;
      return (opts?.defaultValue ?? _key).replace('{{area}}', opts?.area ?? '');
    },
  }),
}));

const { serviceAreaOptions, serviceAreaValue } = await import('@/src/features/agents/serviceAreas/serviceAreaOptions');
const { default: ServiceAreaSearch } = await import('@/src/features/agents/serviceAreas/ServiceAreaSearch');

describe('serviceAreaOptions', () => {
  it('offers a whole country', () => {
    const options = serviceAreaOptions('greece', [], []);
    expect(options[0]).toMatchObject({ title: 'Greece', value: 'Greece' });
  });

  it('stores a place with its city and country', () => {
    expect(serviceAreaValue('Syntagma Square', 'Athens, Greece')).toBe('Syntagma Square, Athens, Greece');
  });

  it('leaves out areas the agent already has, whatever the spelling', () => {
    const options = serviceAreaOptions('serbia', [], ['SERBIA']);
    expect(options.some((o) => o.value === 'Serbia')).toBe(false);
  });
});

describe('ServiceAreaSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const type = async (value: string) => {
    fireEvent.change(screen.getByRole('combobox'), { target: { value } });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  };

  it('finds a city outside any chosen country and adds it', async () => {
    const onAdd = vi.fn();
    render(<ServiceAreaSearch areas={[]} onAdd={onAdd} />);

    await type('athens');
    fireEvent.click(screen.getAllByRole('button', { name: /^Athens/ })[0]);

    expect(onAdd).toHaveBeenCalledWith(expect.stringMatching(/^Athens, .*Greece$/));
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('lets the agent add what they typed when no place matches', async () => {
    const onAdd = vi.fn();
    render(<ServiceAreaSearch areas={[]} onAdd={onAdd} />);

    await type('Qwxyz Bay');
    fireEvent.click(screen.getByRole('button', { name: 'Add "Qwxyz Bay"' }));

    expect(onAdd).toHaveBeenCalledWith('Qwxyz Bay');
  });

  it('adds the highlighted row on Enter', async () => {
    const onAdd = vi.fn();
    render(<ServiceAreaSearch areas={[]} onAdd={onAdd} />);

    await type('montenegro');
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });

    expect(onAdd).toHaveBeenCalledWith('Montenegro');
  });
});

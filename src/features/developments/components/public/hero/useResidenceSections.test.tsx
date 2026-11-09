import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { act, render } from '@testing-library/react';
import type { Development } from '../../../types';
import { useResidenceSections } from './useResidenceSections';

vi.mock('react-i18next', async () => (await import('../explorer/__tests__/i18nMock')).default);
const h = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@/src/app/router/navigation', () => ({ navigate: h.navigate }));

const withBuilder = { id: 'd', name: 'East Gate', slug: 'east-gate', builder: { name: 'Balkan Build' } } as Development;
let result: ReturnType<typeof useResidenceSections>;
const Probe = ({ development }: { development?: Development }) => {
  result = useResidenceSections(development);
  return <div id="units" />;
};
const mount = (development: Development | undefined, state?: unknown) => {
  const router = createMemoryRouter([{ path: '/en/developments/east-gate', element: <Probe development={development} /> }], {
    initialEntries: [{ pathname: '/en/developments/east-gate', state }],
  });
  render(<RouterProvider router={router} />);
};

beforeEach(() => {
  h.navigate.mockReset();
  vi.useRealTimers();
});

describe('useResidenceSections', () => {
  it('lists “The builder” first when there is one; it opens the company page, the others scroll', () => {
    mount(withBuilder);
    expect(result.sections.map((s) => s.id)).toEqual(['builder', 'overview', 'units', 'location']);
    act(() => result.onSection('builder'));
    expect(h.navigate).toHaveBeenCalledWith('/developments/east-gate/developer');
    const scroll = vi.fn();
    (document.getElementById('units') as HTMLElement).scrollIntoView = scroll;
    act(() => result.onSection('units'));
    expect(scroll).toHaveBeenCalled();
    expect(result.openDeveloper).toBeTypeOf('function');
  });

  it('calls the publishing agency “The company” when it stands in for the builder', () => {
    mount({ ...withBuilder, builder: { name: 'Vardar Homes', source: 'agency' } });
    expect(result.sections[0]).toEqual({ id: 'builder', label: 'The company' });
  });

  it('without a builder there is no company page to open', () => {
    mount({ ...withBuilder, builder: undefined });
    expect(result.sections.map((s) => s.id)).toEqual(['overview', 'units', 'location']);
    expect(result.openDeveloper).toBeUndefined();
  });

  it('opens at the section the company page asked for, once the residence has loaded', () => {
    vi.useFakeTimers();
    const scroll = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scroll;
    mount(withBuilder, { section: 'units' });
    act(() => vi.advanceTimersByTime(200));
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    HTMLElement.prototype.scrollIntoView = original;
    vi.useRealTimers();
  });
});

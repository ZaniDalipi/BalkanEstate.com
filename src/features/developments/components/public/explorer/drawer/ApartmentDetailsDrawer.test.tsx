import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ApartmentDetailsDrawer } from './ApartmentDetailsDrawer';
import { useUnitDrawer } from '../../../../hooks/useUnitDrawer';
import { usePseudoFullscreen } from '../usePseudoFullscreen';
import type { PublicUnitDetail } from '../../../../types';

vi.mock('react-i18next', async () => (await import('../__tests__/i18nMock')).default);

const h = vi.hoisted(() => ({
  router: null as null | { navigate: (to: unknown, o?: unknown) => Promise<void> },
  detail: null as null | PublicUnitDetail,
  sendUnitInquiry: vi.fn(),
}));

vi.mock('@/src/app/router/navigation', () => ({
  navigate: (to: string, o?: { replace?: boolean; state?: unknown }) => h.router!.navigate(to, { replace: o?.replace, state: o?.state }),
  goBack: () => h.router!.navigate(-1),
  replaceQueryString: () => undefined,
}));
vi.mock('../../../../api/developmentsApi', () => ({
  getPublicUnit: () => Promise.resolve(h.detail),
  sendUnitInquiry: (...a: unknown[]) => h.sendUnitInquiry(...a),
}));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({
    state: { isAuthenticated: false, savedHomes: [], comparisonList: [], currentUser: null },
    dispatch: vi.fn(),
    toggleSavedHome: vi.fn(),
  }),
}));
vi.mock('@/src/features/properties/hooks/useProperty', () => ({
  useProperty: (id: string) => ({ property: id ? { id, title: 'Listing', imageUrl: '' } : null }),
}));
vi.mock('@/src/components/marketing/SocialShare', () => ({ SocialShare: () => <button type="button">Share</button> }));

const detail = (over: Partial<PublicUnitDetail['unit']> = {}, allowUnitInquiries = true): PublicUnitDetail => ({
  unit: {
    id: 'u1', developmentId: 'd', buildingId: 'b', floorId: 'f', unitNumber: 'A12', unitType: 'apartment',
    availability: 'available', listingIds: [], beds: 2, totalArea: 80, price: 150000, currency: 'EUR', ...over,
  },
  development: { name: 'East Gate', slug: 'res', city: 'Skopje', country: 'MK', allowUnitInquiries },
  listings: over.primaryListingId ? [{ id: over.primaryListingId, title: 'Listing' }] : [],
});

const Harness = () => {
  const d = useUnitDrawer();
  const fs = usePseudoFullscreen<HTMLElement>();
  return (
    <>
      <section ref={fs.stageRef} aria-label="stage" data-fullscreen={fs.isFullscreen ? 'on' : 'off'} style={{ zIndex: 4000 }}>
        <button type="button" onClick={fs.toggle}>toggle-full</button>
      </section>
      <button type="button" onClick={() => d.open('u1')}>open-unit</button>
      <ApartmentDetailsDrawer slug="res" unitId={d.unitId} onClose={d.close} />
    </>
  );
};

/** A platform modal as the inquiry / viewing / gallery modals render it: portalled, aria-modal, z ≥ 5000. */
const openPlatformModal = () => {
  const modal = document.createElement('div');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.style.zIndex = '5000';
  modal.innerHTML = '<button type="button">modal-close</button>';
  document.body.appendChild(modal);
  (modal.querySelector('button') as HTMLButtonElement).focus();
  return modal;
};

const mount = (entry: string) => {
  const router = createMemoryRouter([{ path: '/en/developments/res', element: <Harness /> }], { initialEntries: [entry] });
  h.router = router as never;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
};

beforeEach(() => {
  h.detail = detail();
  h.sendUnitInquiry.mockReset();
});

describe('ApartmentDetailsDrawer + useUnitDrawer', () => {
  it('lists the parking spot an apartment comes with; tapping it opens the spot’s own details', async () => {
    h.detail = {
      ...detail(),
      companions: [
        {
          relation: 'comes_with',
          unit: { id: 'p1', developmentId: 'd', buildingId: 'b', floorId: 'f', unitNumber: 'P1-01', unitType: 'parking', availability: 'available', listingIds: [], price: 15000, currency: 'EUR', buildingName: 'Podium' },
        },
      ],
    } as PublicUnitDetail;
    const router = mount('/en/developments/res?unit=u1');
    const spot = await screen.findByRole('button', { name: /Parking P1-01/ });
    expect(screen.getByRole('region', { name: 'Comes with' })).toContainElement(spot);
    fireEvent.click(spot);
    await waitFor(() => expect(router.state.location.search).toBe('?unit=p1'));
  });

  it('on phones the sheet is full-size and slides; the handle switches between half and full', async () => {
    mount('/en/developments/res?unit=u1');
    await screen.findByRole('heading', { name: 'Apt A12' });
    const sheet = screen.getByRole('dialog');
    // Always as tall as "full" (90% of the screen); how far it is pulled down says how much shows.
    expect(sheet.style.height).toBe(`${Math.round(window.innerHeight * 0.9)}px`);
    expect(screen.getByRole('button', { name: 'Show all details' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Show all details' }));
    const handle = screen.getByRole('button', { name: 'Show the building' });
    expect(handle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(handle);
    expect(screen.getByRole('button', { name: 'Show all details' })).toHaveAttribute('aria-expanded', 'false');
  });

  describe('dragging the phone sheet', () => {
    const touch = (el: Element, type: 'touchStart' | 'touchMove' | 'touchEnd', y: number, x = 100) =>
      fireEvent[type](el, { touches: type === 'touchEnd' ? [] : [{ clientX: x, clientY: y }] });
    /** The finger takes real time between moves (jsdom stamps events itself), so the release speed is realistic. */
    const pause = () => act(async () => { await new Promise((r) => setTimeout(r, 16)); });
    /** A finger lands after the sheet has finished sliding open. */
    const opened = () => act(async () => { await new Promise((r) => setTimeout(r, 900)); });
    const drag = async (el: Element, from: number, to: number) => {
      touch(el, 'touchStart', from);
      for (let i = 1; i <= 5; i += 1) {
        await pause();
        touch(el, 'touchMove', from + ((to - from) * i) / 5);
      }
      touch(el, 'touchEnd', to);
    };

    it('drag the handle up and it grows to full; drag it back down and it returns to half', async () => {
      mount('/en/developments/res?unit=u1');
      await screen.findByRole('heading', { name: 'Apt A12' });
      await opened();
      await drag(screen.getByRole('button', { name: 'Show all details' }), 500, 200);
      expect(screen.getByRole('button', { name: 'Show the building' })).toHaveAttribute('aria-expanded', 'true');
      await opened();
      await drag(screen.getByRole('button', { name: 'Show the building' }), 200, 330);
      expect(screen.getByRole('button', { name: 'Show all details' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('a long pull down from half closes it (and removes ?unit=)', async () => {
      const router = mount('/en/developments/res?unit=u1');
      await screen.findByRole('heading', { name: 'Apt A12' });
      await opened();
      await drag(screen.getByRole('button', { name: 'Show all details' }), 300, 760);
      await waitFor(() => expect(router.state.location.search).toBe(''));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('a short pull down from half does not close it', async () => {
      const router = mount('/en/developments/res?unit=u1');
      await screen.findByRole('heading', { name: 'Apt A12' });
      await opened();
      await drag(screen.getByRole('button', { name: 'Show all details' }), 300, 340);
      expect(router.state.location.search).toBe('?unit=u1');
      expect(screen.getByRole('button', { name: 'Show all details' })).toBeInTheDocument();
    });

    it('swiping up on the details at half height grows the sheet (they do not scroll yet)', async () => {
      mount('/en/developments/res?unit=u1');
      const heading = await screen.findByRole('heading', { name: 'Apt A12' });
      await opened();
      await drag(heading, 600, 250);
      expect(screen.getByRole('button', { name: 'Show the building' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('at full height the details scroll: a swipe up on them leaves the sheet alone', async () => {
      mount('/en/developments/res?unit=u1');
      const heading = await screen.findByRole('heading', { name: 'Apt A12' });
      await opened();
      fireEvent.click(screen.getByRole('button', { name: 'Show all details' }));
      await drag(heading, 600, 250);
      expect(screen.getByRole('button', { name: 'Show the building' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('a sideways swipe (the photo gallery) does not move the sheet', async () => {
      mount('/en/developments/res?unit=u1');
      const heading = await screen.findByRole('heading', { name: 'Apt A12' });
      await opened();
      touch(heading, 'touchStart', 500, 300);
      await pause();
      touch(heading, 'touchMove', 505, 200);
      await pause();
      touch(heading, 'touchMove', 505, 100);
      touch(heading, 'touchEnd', 505, 100);
      expect(screen.getByRole('button', { name: 'Show all details' })).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('opens from ?unit= and closing removes the param (replace)', async () => {
    const router = mount('/en/developments/res?unit=u1&beds=2');
    expect(await screen.findByRole('heading', { name: 'Apt A12' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(router.state.location.search).toBe('?beds=2'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opening pushes a history entry so Back (or Esc) closes it', async () => {
    const router = mount('/en/developments/res');
    fireEvent.click(screen.getByText('open-unit'));
    await screen.findByRole('dialog');
    expect(router.state.location.search).toBe('?unit=u1');
    expect(router.state.historyAction).toBe('PUSH');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(router.state.historyAction).toBe('POP');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('a unit without a listing shows the validated inquiry form', async () => {
    h.sendUnitInquiry.mockResolvedValue({ message: 'ok' });
    mount('/en/developments/res?unit=u1');
    const form = await screen.findByRole('form', { name: 'Ask about this apartment' });
    expect(screen.queryByText('Schedule viewing')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
    expect(await screen.findAllByText('This field is required.')).toHaveLength(2);
    expect(h.sendUnitInquiry).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    await act(async () => {
      fireEvent.submit(form);
    });
    await screen.findByRole('status');
    expect(h.sendUnitInquiry).toHaveBeenCalledWith('res', 'u1', expect.objectContaining({ name: 'Ana', email: 'ana@example.com' }));
  });

  it('shows the error state when the inquiry fails', async () => {
    h.sendUnitInquiry.mockRejectedValue(new Error('boom'));
    mount('/en/developments/res?unit=u1');
    const form = await screen.findByRole('form');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(await screen.findByText('Your inquiry could not be sent. Please try again.')).toBeInTheDocument();
  });

  it('hides the inquiry form when the development disallows unit inquiries', async () => {
    h.detail = detail({}, false);
    mount('/en/developments/res?unit=u1');
    await screen.findByRole('heading', { name: 'Apt A12' });
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('a unit with a primary listing offers the listing actions', async () => {
    h.detail = detail({ primaryListingId: 'p1', hasListing: true });
    mount('/en/developments/res?unit=u1');
    expect(await screen.findByRole('button', { name: /Send inquiry/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Schedule viewing/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open full listing/ })).toBeInTheDocument();
  });

  it('a sold unit shows no inquiry or viewing CTAs', async () => {
    h.detail = detail({ availability: 'sold', primaryListingId: 'p1', hasListing: true });
    mount('/en/developments/res?unit=u1');
    expect(await screen.findByRole('button', { name: /Open full listing/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Send inquiry/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Schedule viewing/ })).not.toBeInTheDocument();
  });

  it('a sold unit without a listing shows no inquiry form', async () => {
    h.detail = detail({ availability: 'sold' });
    mount('/en/developments/res?unit=u1');
    expect(await screen.findByText('This apartment is no longer available.')).toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('Esc with a platform modal above closes neither the drawer nor full screen; later presses peel one layer each', async () => {
    const router = mount('/en/developments/res');
    const stage = screen.getByRole('region', { name: 'stage' });
    fireEvent.click(screen.getByText('toggle-full'));
    expect(stage.dataset.fullscreen).toBe('on');
    fireEvent.click(screen.getByText('open-unit'));
    await screen.findByRole('heading', { name: 'Apt A12' });

    const modal = openPlatformModal();
    fireEvent.keyDown(modal.querySelector('button') as HTMLElement, { key: 'Escape' });
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(router.state.location.search).toBe('?unit=u1');
    expect(stage.dataset.fullscreen).toBe('on');

    // The modal closes itself; the next Esc closes the drawer (history back), full screen stays.
    modal.remove();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(stage.dataset.fullscreen).toBe('on');
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Apt A12' })).not.toBeInTheDocument());

    // And the one after that exits full screen.
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(stage.dataset.fullscreen).toBe('off');
  });
});

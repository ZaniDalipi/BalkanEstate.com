import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { Hotspot, Scene } from '../../types';

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key: string, def?: unknown, opts?: Record<string, unknown>) => {
      let s = typeof def === 'string' ? def : key;
      const vars = (typeof def === 'object' && def ? def : opts) as Record<string, unknown> | undefined;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{{${k}}}`, String(v));
      return s;
    },
    i18n: { language: 'en' },
  }),
}));

const mutations = {
  saveDraft: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  uploadImage: vi.fn(),
  updateView: vi.fn(),
  remove: vi.fn(),
  isSaving: false,
  isPublishing: false,
  isUnpublishing: false,
  isUploading: false,
  isUpdatingView: false,
  isRemoving: false,
  error: null,
};

vi.mock('../../hooks/useScenes', () => ({
  useSceneMutations: () => mutations,
  useScenes: () => ({ scenes: [], isLoading: false, error: null, refetch: vi.fn(async () => ({ data: { scenes: [] } })) }),
  useAttachableListings: () => ({ listings: [], isLoading: false, error: null }),
}));

vi.mock('../../hooks/useDevelopment', () => ({
  useDevelopmentStructure: () => ({
    buildings: [{ id: 'b1', name: 'B2', developmentId: 'd1', slug: 'b2', order: 0 }],
    floors: [],
    entrances: [],
    isLoading: false,
    error: null,
  }),
  useDevelopmentUnits: () => ({
    units: [
      { id: 'u1', unitNumber: 'A-101', availability: 'available', effectiveAvailability: 'available', buildingId: 'b1', floorId: 'f1' },
      { id: 'u2', unitNumber: 'A-102', availability: 'sold', effectiveAvailability: 'sold', buildingId: 'b1', floorId: 'f1' },
    ],
    total: 2,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/src/shared/hooks/useConfirmation', () => ({
  useConfirmation: () => ({ confirm: vi.fn(async () => true) }),
}));

import { SceneEditor } from './SceneEditor';

const makeScene = (hotspots: Hotspot[]): Scene => ({
  id: 's1',
  developmentId: 'd1',
  targetType: 'building',
  targetId: 'b1',
  viewKey: 'main',
  viewDirection: 'front',
  sortOrder: 0,
  imageUrl: 'https://example.test/b2.jpg',
  imageWidth: 2000,
  imageHeight: 1000,
  draft: { hotspots, version: 3 },
  version: 3,
});

const square = (id: string, linkId: string): Hotspot => ({
  id,
  shape: 'polygon',
  points: [
    [0.1, 0.1],
    [0.3, 0.1],
    [0.3, 0.3],
    [0.1, 0.3],
  ],
  linkType: 'unit',
  linkId,
  label: id,
  z: 0,
});

beforeAll(() => {
  // jsdom has no layout: give the canvas a real size so pointer maths work.
  Element.prototype.getBoundingClientRect = function rect() {
    return { left: 0, top: 0, right: 1000, bottom: 500, width: 1000, height: 500, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mutations.saveDraft.mockResolvedValue({ scene: makeScene([]) });
  mutations.publish.mockResolvedValue({ scene: makeScene([]) });
});

describe('SceneEditor', () => {
  it('blocks publishing while a region has issues (missing link) and never pushes the draft', async () => {
    render(<SceneEditor developmentId="d1" scene={makeScene([square('ok', 'u1'), square('bad', '')])} />);

    expect(screen.getByText('1 region(s) need attention before publishing.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByText('Fix the highlighted regions before publishing.')).toBeTruthy();
    expect(mutations.publish).not.toHaveBeenCalled();
    expect(mutations.saveDraft).not.toHaveBeenCalled();
  });

  it('does not publish when the save before publishing fails', async () => {
    mutations.saveDraft.mockRejectedValueOnce(
      Object.assign(new Error('bad'), { statusCode: 400, details: { errors: [{ index: 0, hotspotId: 'ok', code: 'link_not_found', message: 'x' }] } })
    );
    render(<SceneEditor developmentId="d1" scene={makeScene([square('ok', 'u1')])} />);
    // Make it dirty: change the label.
    fireEvent.click(screen.getByRole('button', { name: /ok/ }));
    fireEvent.change(screen.getByLabelText('Label (optional)'), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(mutations.saveDraft).toHaveBeenCalledTimes(1));
    expect(mutations.saveDraft.mock.calls[0][0]).toMatchObject({ sceneId: 's1', baseVersion: 3 });
    expect(await screen.findByText('Linked item no longer exists')).toBeTruthy();
    expect(mutations.publish).not.toHaveBeenCalled();
  });

  it('a newly drawn region is left unlinked (no auto-link to the first unit)', async () => {
    const { container } = render(<SceneEditor developmentId="d1" scene={makeScene([])} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rectangle' }));
    const svg = container.querySelector('svg[preserveAspectRatio="none"]') as SVGSVGElement;
    fireEvent.pointerDown(svg, { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(svg, { clientX: 400, clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(svg, { clientX: 400, clientY: 300, pointerId: 1 });

    const list = await screen.findByRole('list', { name: 'Regions' });
    expect(within(list).getByText('Unlinked region')).toBeTruthy();
    expect(screen.getAllByText('Missing link').length).toBeGreaterThan(0);
    const listbox = screen.getByRole('listbox', { name: 'Target' });
    expect(within(listbox).queryAllByRole('option', { selected: true })).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Every region needs a valid shape and a link before the draft can be saved.')).toBeTruthy();
    expect(mutations.saveDraft).not.toHaveBeenCalled();

    // Linking it clears the issue and saving then sends the chosen unit with baseVersion.
    fireEvent.click(within(listbox).getByRole('button', { name: /A-102/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(mutations.saveDraft).toHaveBeenCalledTimes(1));
    const sent = mutations.saveDraft.mock.calls[0][0];
    expect(sent.baseVersion).toBe(3);
    expect(sent.hotspots).toHaveLength(1);
    expect(sent.hotspots[0]).toMatchObject({ shape: 'rect', linkType: 'unit', linkId: 'u2' });
  });

  it('shows a reload option on a version conflict', async () => {
    mutations.saveDraft.mockRejectedValueOnce(
      Object.assign(new Error('conflict'), { statusCode: 409, code: 'version_conflict', details: { code: 'version_conflict', currentVersion: 4 } })
    );
    render(<SceneEditor developmentId="d1" scene={makeScene([square('ok', 'u1')])} />);
    fireEvent.click(screen.getByRole('button', { name: /ok/ }));
    fireEvent.change(screen.getByLabelText('Label (optional)'), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByRole('button', { name: 'Reload latest (discard my changes)' })).toBeTruthy();
  });

  it('a refetch with a newer draft never clobbers dirty edits; after our own save the selection survives', async () => {
    const v3 = makeScene([square('ok', 'u1')]);
    const { rerender } = render(<SceneEditor developmentId="d1" scene={v3} />);
    fireEvent.click(screen.getByRole('button', { name: /ok/ }));
    fireEvent.change(screen.getByLabelText('Label (optional)'), { target: { value: 'Mine' } });

    // Someone else's version arrives while we are dirty: keep local edits.
    rerender(<SceneEditor developmentId="d1" scene={{ ...v3, draft: { hotspots: [square('ok', 'u2')], version: 4 } }} />);
    expect((screen.getByLabelText('Label (optional)') as HTMLInputElement).value).toBe('Mine');

    // Our save succeeds as version 5; the refetch carrying v5 is a no-op and the region stays selected.
    const saved = { ...v3, draft: { hotspots: [{ ...square('ok', 'u1'), label: 'Mine' }], version: 5 } };
    mutations.saveDraft.mockResolvedValueOnce({ scene: saved });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Draft saved.')).toBeTruthy();
    rerender(<SceneEditor developmentId="d1" scene={saved} />);
    expect((screen.getByLabelText('Label (optional)') as HTMLInputElement).value).toBe('Mine');
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('preview draws the colour-blind availability patterns over unit regions', () => {
    const { container } = render(<SceneEditor developmentId="d1" scene={makeScene([square('free', 'u1'), square('gone', 'u2')])} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    // The shared AvailabilityPatterns defs, scaled to the editor's 0..aspect viewBox (aspect 2, image 2000 px).
    const sold = container.querySelector('pattern#be-av-sold') as SVGPatternElement;
    expect(sold).toBeTruthy();
    expect(Number(sold.getAttribute('width'))).toBeCloseTo((2000 / 90) * (2 / 2000), 6);
    // Sold (cross) gets a pattern overlay; available is solid, so none.
    expect(container.querySelector('[data-pattern-for="gone"]')?.getAttribute('fill')).toBe('url(#be-av-sold)');
    expect(container.querySelector('[data-pattern-for="free"]')).toBeNull();
  });
});

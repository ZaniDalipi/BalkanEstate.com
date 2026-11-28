import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AutoFloors } from './AutoFloors';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import type { DevelopmentFloor, Hotspot, Scene } from '../../../types';

const rect = (id: string, y0: number, linkId: string): Hotspot => ({ id, shape: 'rect', points: [[0.2, y0], [0.8, y0 + 0.1]], linkType: 'unit', linkId, z: 0 });
const view = (id: string, targetId: string, direction: Scene['viewDirection'], hotspots: Hotspot[]): Scene =>
  ({ id, developmentId: 'd1', targetType: 'building', targetId, viewKey: id, viewDirection: direction, sortOrder: 0, imageUrl: `https://m.test/${id}.webp`, imageWidth: 100, imageHeight: 100, draft: { hotspots, version: 1 }, version: 1 }) as Scene;
const floor = (id: string, buildingId: string, level: number) => ({ id, buildingId, level, label: `F${level}` }) as DevelopmentFloor;
const unit = (id: string, unitNumber: string, floorId: string) => ({ id, unitNumber, floorId });

let scenes: Scene[] = [];
let structure = { floors: [] as DevelopmentFloor[], buildings: [] as { id: string; name: string }[], isLoading: false, error: null as unknown };
let ownUnits: ReturnType<typeof unit>[] = [];
vi.mock('../../../hooks/useScenes', () => ({ useScenes: () => ({ scenes }) }));
vi.mock('../../../hooks/useDevelopment', () => ({
  useDevelopmentStructure: () => structure,
  useDevelopmentUnits: (id: string | undefined) => ({ units: id ? ownUnits : [], total: ownUnits.length, isLoading: false }),
}));

const aFloors = [floor('f0', 'A', 0), floor('f1', 'A', 1), floor('f2', 'A', 2), floor('f3', 'A', 3)];
const aUnits = [unit('u101', 'A-101', 'f1'), unit('u102', 'A-102', 'f1'), unit('u201', 'A-201', 'f2'), unit('u202', 'A-202', 'f2'), unit('u301', 'A-301', 'f3'), unit('u302', 'A-302', 'f3')];
const aFront = view('aF', 'A', 'front', []);

let onPlaced = vi.fn();
const open = (hotspots: Hotspot[]) => {
  let n = 0;
  const dispatch = vi.fn();
  onPlaced = vi.fn();
  const editor = { dispatch, nextId: () => `n${++n}`, state: { hotspots } } as unknown as PolygonEditor;
  render(<AutoFloors developmentId="d1" scene={aFront} editor={editor} onPlaced={onPlaced} />);
  return dispatch;
};
const setup = () => { scenes = [aFront]; structure = { floors: aFloors, buildings: [], isLoading: false, error: null }; ownUnits = aUnits; };

describe('AutoFloors', () => {
  it('explains the steps until a linked floor above the ground is drawn, and counts the unlinked regions', () => {
    setup();
    open([rect('x', 0.5, ''), { ...rect('g', 0.85, ''), linkType: 'floor', linkId: 'f0' }]);
    expect(screen.getByRole('status')).toHaveTextContent('editor.autoFloors.how1');
    expect(screen.getByText('editor.autoFloors.unlinked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editor.autoFloors.create/ })).toBeNull();
  });

  it('fills the floors above the drawn one in one step, linked by apartment number, and hands them to the review', () => {
    setup();
    const dispatch = open([rect('a', 0.7, 'u101'), rect('b', 0.7, 'u102')]);
    expect(screen.getByText(/editor.autoFloors.drawnHere/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'editor.autoFloors.create' }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    const added = dispatch.mock.calls[0][0].hotspots as Hotspot[];
    // Each new floor: its whole-floor outline (on by default), then the apartments with the same numbers.
    expect(added.map((h) => h.linkId)).toEqual(['f2', 'u201', 'u202', 'f3', 'u301', 'u302']);
    expect(onPlaced).toHaveBeenCalledWith(added);
    expect(screen.getByText('editor.autoFloors.qualityEstimated')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('editor.autoFloors.done');
    expect(screen.getByRole('status')).toHaveTextContent('editor.autoFloors.checkNow');
    expect(screen.getByRole('status')).toHaveTextContent('editor.autoFloors.linked');
  });

  it('shows the reason next to the spacing and adds nothing when it is wrong', () => {
    setup();
    const dispatch = open([rect('a', 0.7, 'u101')]);
    fireEvent.change(screen.getByLabelText('editor.autoFloors.spacing'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /editor.autoFloors.create/ }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('editor.autoFloors.spacingInvalid');
    expect(screen.getByLabelText('editor.autoFloors.spacing')).toHaveAttribute('aria-describedby', alert.id);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('says when every floor is already drawn and disables Add', () => {
    setup();
    open([rect('g', 0.85, 'u101'), rect('a', 0.7, 'u101'), rect('b', 0.55, 'u201'), rect('c', 0.4, 'u301')].map((h, i) => (i === 0 ? { ...h, linkType: 'floor' as const, linkId: 'f0' } : h)));
    expect(screen.getByRole('status')).toHaveTextContent('editor.autoFloors.allDrawn');
    expect(screen.getByRole('button', { name: 'editor.autoFloors.createNone' })).toBeDisabled();
  });

  it('tells the owner to add floors first when the building has none, and reports a failed load', () => {
    setup();
    structure = { ...structure, floors: [] };
    open([]);
    expect(screen.getByRole('status')).toHaveTextContent('editor.autoFloors.noFloors');
    structure = { ...structure, error: new Error('offline') };
    open([]);
    expect(screen.getByRole('alert')).toHaveTextContent('editor.autoFloors.loadFailed');
  });
});

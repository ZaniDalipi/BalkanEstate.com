import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AutoFloors } from './AutoFloors';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import type { DevelopmentFloor, Hotspot, Scene } from '../../../types';

const band = (id: string, y0: number, linkId: string): Hotspot => ({ id, shape: 'rect', points: [[0.2, y0], [0.8, y0 + 0.1]], linkType: 'floor', linkId, z: 0 });
const view = (id: string, targetId: string, direction: Scene['viewDirection'], hotspots: Hotspot[]): Scene =>
  ({ id, developmentId: 'd1', targetType: 'building', targetId, viewKey: id, viewDirection: direction, sortOrder: 0, imageUrl: `https://m.test/${id}.webp`, imageWidth: 100, imageHeight: 100, draft: { hotspots, version: 1 }, version: 1 }) as Scene;
const floor = (id: string, buildingId: string, level: number) => ({ id, buildingId, level, label: `F${level}` }) as DevelopmentFloor;

let scenes: Scene[] = [];
let structure: { floors: DevelopmentFloor[]; buildings: { id: string; name: string }[]; isLoading: boolean; error: unknown } = { floors: [], buildings: [], isLoading: false, error: null };
vi.mock('../../../hooks/useScenes', () => ({ useScenes: () => ({ scenes }) }));
vi.mock('../../../hooks/useDevelopment', () => ({ useDevelopmentStructure: () => structure }));

const aRight = view('aR', 'A', 'right', [band('g', 0.7, 'a0'), band('f1', 0.55, 'a1')]);
const cRight = view('cR', 'C', 'right', []);
const allFloors = [floor('a0', 'A', 0), floor('a1', 'A', 1), floor('c0', 'C', 0), floor('c1', 'C', 1), floor('c2', 'C', 2)];

const open = (existing: Hotspot[] = []) => {
  let n = 0;
  const dispatch = vi.fn();
  const editor = { dispatch, nextId: () => `n${++n}`, state: { hotspots: existing } } as unknown as PolygonEditor;
  render(<AutoFloors developmentId="d1" scene={cRight} editor={editor} />);
  fireEvent.click(screen.getByText('editor.autoFloors.title'));
  return dispatch;
};
const add = () => fireEvent.click(screen.getByRole('button', { name: 'editor.autoFloors.create' }));

describe('AutoFloors', () => {
  it('tells the owner to add floors first when the building has none', () => {
    scenes = [aRight, cRight];
    structure = { floors: allFloors.filter((f) => f.buildingId === 'A'), buildings: [], isLoading: false, error: null };
    open();
    expect(screen.getByRole('status')).toHaveTextContent('editor.autoFloors.noFloors');
    expect(screen.queryByRole('button', { name: 'editor.autoFloors.create' })).toBeNull();
  });

  it('explains how to make a template when no view has floor regions', () => {
    scenes = [cRight];
    structure = { floors: allFloors, buildings: [], isLoading: false, error: null };
    open();
    expect(screen.getByRole('status')).toHaveTextContent('editor.autoFloors.empty');
  });

  it('shows an error when the floors cannot be loaded', () => {
    structure = { floors: [], buildings: [], isLoading: false, error: new Error('offline') };
    open();
    expect(screen.getByRole('alert')).toHaveTextContent('editor.autoFloors.loadFailed');
  });

  it('adds one linked region per floor from the same side of another building in one step', () => {
    scenes = [aRight, cRight];
    structure = { floors: allFloors, buildings: [{ id: 'A', name: 'A1' }], isLoading: false, error: null };
    const dispatch = open();
    expect(screen.getByText('editor.autoFloors.found')).toBeInTheDocument();
    expect(screen.getByLabelText('editor.autoFloors.source').querySelector('option')).toHaveTextContent('editor.autoFloors.optionSameSide');
    add();
    expect(dispatch).toHaveBeenCalledTimes(1);
    const added = dispatch.mock.calls[0][0].hotspots as Hotspot[];
    expect(added.map((h) => h.linkId)).toEqual(['c0', 'c1', 'c2']);
    expect(screen.getByRole('status')).toHaveTextContent('editor.autoFloors.done');
    expect(screen.getByRole('status')).toHaveTextContent('editor.autoFloors.estimated');
  });

  it('warns when the layout comes from another side', () => {
    scenes = [view('aF', 'A', 'front', aRight.draft.hotspots), cRight];
    structure = { floors: allFloors, buildings: [], isLoading: false, error: null };
    open();
    expect(screen.getByText('editor.autoFloors.otherSide')).toBeInTheDocument();
  });

  it('refuses when every floor is already on the view, and shows field errors without adding', () => {
    scenes = [aRight, cRight];
    structure = { floors: allFloors, buildings: [], isLoading: false, error: null };
    const dispatch = open([band('x', 0.7, 'c0'), band('y', 0.55, 'c1'), band('z', 0.4, 'c2')]);
    add();
    expect(screen.getByRole('alert')).toHaveTextContent('editor.autoFloors.allThere');
    fireEvent.change(screen.getByLabelText('editor.copyFrom.size'), { target: { value: '5' } });
    add();
    expect(screen.getByRole('alert')).toHaveTextContent('editor.copyFrom.sizeInvalid');
    expect(dispatch).not.toHaveBeenCalled();
  });
});

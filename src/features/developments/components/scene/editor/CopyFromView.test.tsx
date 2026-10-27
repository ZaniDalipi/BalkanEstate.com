import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CopyFromView } from './CopyFromView';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import type { Hotspot, Scene } from '../../../types';

const region = (id: string, x0: number, x1: number, linkId = 'u1'): Hotspot => ({ id, shape: 'rect', points: [[x0, 0.2], [x1, 0.3]], linkType: 'unit', linkId, z: 0 });
const view = (id: string, direction: Scene['viewDirection'], hotspots: Hotspot[], targetId = 'b1'): Scene =>
  ({ id, developmentId: 'd1', targetType: 'building', targetId, viewKey: id, viewDirection: direction, sortOrder: 0, imageUrl: `https://m.test/${id}.webp`, imageWidth: 100, imageHeight: 100, draft: { hotspots, version: 1 }, version: 1 }) as Scene;

let scenes: Scene[] = [];
vi.mock('../../../hooks/useScenes', () => ({ useScenes: () => ({ scenes }) }));

const open = (current: Scene, existing = 0) => {
  let n = 0;
  const dispatch = vi.fn();
  const editor = { dispatch, nextId: () => `n${++n}`, state: { hotspots: Array.from({ length: existing }, (_, i) => region(`e${i}`, 0.1, 0.2)) } } as unknown as PolygonEditor;
  render(<CopyFromView developmentId="d1" scene={current} editor={editor} />);
  fireEvent.click(screen.getByText('editor.copyFrom.title'));
  return dispatch;
};
const copy = () => fireEvent.click(screen.getByRole('button', { name: 'editor.copyFrom.create' }));

describe('CopyFromView', () => {
  const front = view('front', 'front', [region('a', 0.1, 0.2), region('b', 0.3, 0.4, 'u2')]);
  const left = view('left', 'left', []);

  it('says what to do first when no other view of the building has regions', () => {
    scenes = [front, left];
    open(front);
    expect(screen.getByRole('status')).toHaveTextContent('editor.copyFrom.empty');
    expect(screen.queryByRole('button', { name: 'editor.copyFrom.create' })).toBeNull();
  });

  it('copies the regions of another view of the same building, keeping their links', () => {
    scenes = [front, left];
    const dispatch = open(left);
    copy();
    expect(dispatch).toHaveBeenCalledWith({ type: 'ADD_MANY', hotspots: expect.any(Array) });
    const added = dispatch.mock.calls[0][0].hotspots as Hotspot[];
    expect(added.map((h) => [h.id, h.linkId])).toEqual([['n1', 'u1'], ['n2', 'u2']]);
    expect(screen.getByRole('status')).toHaveTextContent('editor.copyFrom.done');
  });

  it('only offers views of the same building', () => {
    scenes = [front, left, view('other', 'front', [region('z', 0.1, 0.2)], 'b2')];
    open(left);
    const options = screen.getByLabelText('editor.copyFrom.source').querySelectorAll('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('editor.copyFrom.sourceOption');
  });

  it('mirrors, and clears the links when asked', () => {
    scenes = [front, left];
    const dispatch = open(left);
    fireEvent.click(screen.getByLabelText('editor.copyFrom.keepLinks'));
    fireEvent.click(screen.getByLabelText('editor.copyFrom.mirror'));
    copy();
    const added = dispatch.mock.calls[0][0].hotspots as Hotspot[];
    expect(added.map((h) => h.linkId)).toEqual(['', '']);
    // Across the picture: 0.1…0.2 → 0.8…0.9 and 0.3…0.4 → 0.6…0.7, each still stored as (min, max).
    expect(added[0].points).toEqual([[expect.closeTo(0.8), 0.2], [expect.closeTo(0.9), 0.3]]);
    expect(added[1].points).toEqual([[expect.closeTo(0.6), 0.2], [expect.closeTo(0.7), 0.3]]);
  });

  it('shows the reason next to the field and copies nothing when a value is wrong', () => {
    scenes = [front, left];
    const dispatch = open(left);
    fireEvent.change(screen.getByLabelText('editor.copyFrom.size'), { target: { value: '5' } });
    copy();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('editor.copyFrom.sizeInvalid');
    expect(screen.getByLabelText('editor.copyFrom.size')).toHaveAttribute('aria-describedby', alert.id);
    fireEvent.change(screen.getByLabelText('editor.copyFrom.size'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('editor.copyFrom.moveX'), { target: { value: 'left' } });
    copy();
    expect(screen.getByRole('alert')).toHaveTextContent('editor.copyFrom.moveInvalid');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('says so when the copies would leave the picture', () => {
    scenes = [front, left];
    const dispatch = open(left);
    fireEvent.change(screen.getByLabelText('editor.copyFrom.moveX'), { target: { value: '100' } });
    copy();
    expect(screen.getByRole('alert')).toHaveTextContent('editor.copyFrom.outside');
    expect(dispatch).not.toHaveBeenCalled();
  });
});

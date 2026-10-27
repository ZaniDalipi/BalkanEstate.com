import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RepeatRegion } from './RepeatRegion';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import type { Hotspot } from '../../../types';

const hotspot: Hotspot = { id: 'a', shape: 'rect', points: [[0.1, 0.1], [0.25, 0.19]], linkType: 'unit', linkId: 'u1', z: 0 };
const make = () => {
  let n = 0;
  const dispatch = vi.fn();
  const editor = { dispatch, nextId: () => `id${++n}` } as unknown as PolygonEditor;
  const view = render(<RepeatRegion editor={editor} hotspot={hotspot} />);
  fireEvent.click(screen.getByText('editor.repeat.title')); // open the <details>
  const select = (h: Hotspot) => view.rerender(<RepeatRegion editor={editor} hotspot={h} />);
  return Object.assign(dispatch, { select });
};
const field = (name: string) => screen.getByLabelText(name);

describe('RepeatRegion', () => {
  it('suggests a spacing from the region and repeats it down with one id per copy', () => {
    const dispatch = make();
    expect(field('editor.repeat.stepHeight')).toHaveValue('11.3');
    fireEvent.change(field('editor.repeat.count'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'editor.repeat.create' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'REPEAT', id: 'a', ids: ['id1', 'id2', 'id3'], direction: 'down', stepPct: 11.3 });
    expect(screen.getByRole('status')).toHaveTextContent('editor.repeat.done');
  });

  it('switching to sideways re-suggests the spacing from the width and asks about the width', () => {
    make();
    fireEvent.change(field('editor.repeat.direction'), { target: { value: 'right' } });
    expect(field('editor.repeat.stepWidth')).toHaveValue('17.3');
  });

  it('shows the reason next to the field and does not copy anything when a value is wrong', () => {
    const dispatch = make();
    fireEvent.change(field('editor.repeat.count'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'editor.repeat.create' }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('editor.repeat.countInvalid');
    expect(field('editor.repeat.count')).toHaveAttribute('aria-describedby', alert.id);
    fireEvent.change(field('editor.repeat.count'), { target: { value: '2' } });
    fireEvent.change(field('editor.repeat.stepHeight'), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: 'editor.repeat.create' }));
    expect(screen.getByRole('alert')).toHaveTextContent('editor.repeat.stepInvalid');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('says so when no copy fits, and when only some do', () => {
    const dispatch = make();
    fireEvent.change(field('editor.repeat.stepHeight'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'editor.repeat.create' }));
    expect(screen.getByRole('alert')).toHaveTextContent('editor.repeat.noRoom');
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.change(field('editor.repeat.stepHeight'), { target: { value: '30' } });
    fireEvent.change(field('editor.repeat.count'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'editor.repeat.create' }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'REPEAT', ids: ['id1', 'id2'] }));
    expect(screen.getByRole('status')).toHaveTextContent('editor.repeat.donePartial');
  });

  it('stays as it is when the editor selects the first copy, and starts over for another region', () => {
    const dispatch = make();
    fireEvent.change(field('editor.repeat.count'), { target: { value: '2' } });
    fireEvent.change(field('editor.repeat.stepHeight'), { target: { value: '14' } });
    fireEvent.click(screen.getByRole('button', { name: 'editor.repeat.create' }));
    // The copy the editor selects next: the message and the chosen spacing stay.
    dispatch.select({ ...hotspot, id: 'id1', linkId: '' });
    expect(screen.getByRole('status')).toHaveTextContent('editor.repeat.done');
    expect(field('editor.repeat.stepHeight')).toHaveValue('14');
    // An unrelated, taller region: the message goes and the spacing is suggested again.
    dispatch.select({ ...hotspot, id: 'other', points: [[0.5, 0.2], [0.6, 0.4]] });
    expect(screen.queryByRole('status')).toBeNull();
    expect(field('editor.repeat.stepHeight')).toHaveValue('25');
  });
});

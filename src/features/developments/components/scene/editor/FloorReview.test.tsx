import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { Hotspot } from '../../../types';
import { usePolygonEditor } from '../../../hooks/usePolygonEditor';
import { useFloorReview } from './useFloorReview';
import { FloorReviewDialog } from './FloorReviewDialog';
import { FloorReviewPanel } from './FloorReviewPanel';
import { SceneStatusBar } from './SceneStatusBar';
import type { SceneSync } from './useSceneSync';
import type { Scene } from '../../../types';

const rect = (id: string, y: number): Hotspot => ({ id, shape: 'rect', points: [[0.2, y], [0.4, y + 0.1]], linkType: 'unit', linkId: '', z: 0 });
const placed = [rect('n1', 0.5), rect('n2', 0.35)];

const setup = () => {
  const { result } = renderHook(() => {
    const editor = usePolygonEditor([rect('own', 0.8)]);
    return { editor, review: useFloorReview(editor) };
  });
  act(() => {
    result.current.editor.dispatch({ type: 'ADD_MANY', hotspots: placed });
    result.current.review.start(placed);
  });
  return result;
};

describe('floor review', () => {
  it('asks to check the new regions right after placing them, and steps through them', async () => {
    const result = setup();
    const { rerender } = render(<FloorReviewDialog review={result.current.review} />);
    expect(screen.getByRole('alertdialog', { name: 'editor.review.title' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'editor.review.start' }));
    expect(result.current.editor.state.selectedId).toBe('n1');
    rerender(<FloorReviewDialog review={result.current.review} />);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('counts a region as checked once it is moved or marked as right', () => {
    const result = setup();
    expect(result.current.review.pending).toEqual(['n1', 'n2']);
    act(() => result.current.editor.dispatch({ type: 'MOVE_SHAPE', id: 'n1', dx: 0.01, dy: 0 }));
    expect(result.current.review.pending).toEqual(['n2']);
    act(() => result.current.editor.dispatch({ type: 'SELECT', id: 'n2' }));
    act(() => result.current.review.markSelected());
    expect(result.current.review.pending).toEqual([]);
    render(<FloorReviewPanel review={result.current.review} />);
    expect(screen.getByRole('status')).toHaveTextContent('editor.review.allChecked');
  });

  it('shows the checklist with "Looks right" for the selected region', () => {
    const result = setup();
    act(() => result.current.editor.dispatch({ type: 'SELECT', id: 'n2' }));
    render(<FloorReviewPanel review={result.current.review} />);
    expect(screen.getByText('editor.review.left')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'editor.review.looksRight' }));
    expect(result.current.review.pending).toEqual(['n1']);
  });

  it('asks before publishing unchecked regions, and offers to check them first', () => {
    const publish = vi.fn();
    const onReview = vi.fn();
    const sync = { dirty: false, isSaving: false, isPublishing: false, isUnpublishing: false, publish, unpublish: vi.fn(), save: vi.fn(), issues: {}, generalIssues: [], notice: null } as unknown as SceneSync;
    const scene = { id: 's', draft: { hotspots: placed, version: 1 }, version: 1 } as unknown as Scene;
    render(<SceneStatusBar scene={scene} sync={sync} issueCount={0} unchecked={2} onReview={onReview} />);
    fireEvent.click(screen.getByRole('button', { name: 'editor.actions.publish' }));
    expect(publish).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('editor.review.confirmPublish');
    fireEvent.click(screen.getByRole('button', { name: 'editor.review.checkFirst' }));
    expect(onReview).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'editor.actions.publish' }));
    fireEvent.click(screen.getByRole('button', { name: 'editor.review.publishAnyway' }));
    expect(publish).toHaveBeenCalled();
  });
});

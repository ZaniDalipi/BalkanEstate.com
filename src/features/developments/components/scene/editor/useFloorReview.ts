import { useCallback, useMemo, useState } from 'react';
import type { Hotspot } from '../../../types';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import { pendingReview } from '../../../utils/floorReview';

/**
 * The check every automatically placed region needs: which ones are still
 * unchecked (not moved or reshaped, not marked as right), the dialog shown right
 * after placing them, and stepping through them one by one. A region removed
 * (Undo, delete) simply leaves the list.
 */
export function useFloorReview(editor: PolygonEditor) {
  const [placed, setPlaced] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const { hotspots, selectedId } = editor.state;

  const pending = useMemo(() => pendingReview(hotspots, placed, checked), [hotspots, placed, checked]);
  const total = useMemo(() => hotspots.filter((h) => placed.has(h.id)).length, [hotspots, placed]);

  const start = useCallback((added: Hotspot[]) => {
    setPlaced(new Map(added.map((h) => [h.id, JSON.stringify(h.points)])));
    setChecked(new Set());
    setDialogOpen(true);
  }, []);

  /** Select the next unchecked region after the selected one (wrapping round); from the dialog, the first. */
  const next = useCallback(() => {
    setDialogOpen(false);
    if (pending.length === 0) return;
    const at = dialogOpen ? -1 : pending.indexOf(selectedId ?? '');
    editor.dispatch({ type: 'SELECT', id: pending[(at + 1) % pending.length] });
  }, [pending, selectedId, dialogOpen, editor]);

  const markSelected = useCallback(() => {
    if (!selectedId) return;
    setChecked((prev) => new Set(prev).add(selectedId));
  }, [selectedId]);

  const markAll = useCallback(() => setChecked(new Set(placed.keys())), [placed]);

  return {
    pending,
    total,
    selectedPending: !!selectedId && pending.includes(selectedId),
    dialogOpen,
    closeDialog: () => setDialogOpen(false),
    start,
    next,
    markSelected,
    markAll,
  };
}

export type FloorReview = ReturnType<typeof useFloorReview>;

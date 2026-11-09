import { useCallback, useMemo, useRef, useState } from 'react';
import type { PublicUnit } from '../../../../types';

/**
 * The floor the buyer is pointing at in the floor picker, and its homes, so
 * the building picture can light them up ("this is floor 3"). `onPoint` hears
 * of each floor pointed at (to start loading its picture).
 */
export function useFloorPreview(unitsById: Map<string, PublicUnit>, onPoint?: (floorId: string) => void) {
  const [floorId, setFloorId] = useState<string | null>(null);
  const onPointRef = useRef(onPoint);
  onPointRef.current = onPoint;
  const setPreviewFloorId = useCallback((id: string | null) => {
    setFloorId(id);
    if (id) onPointRef.current?.(id);
  }, []);
  const litUnitIds = useMemo(() => {
    if (!floorId) return undefined;
    const ids = new Set<string>();
    unitsById.forEach((u) => {
      if (u.floorId === floorId) ids.add(u.id);
    });
    return ids;
  }, [floorId, unitsById]);
  return { previewFloorId: floorId, setPreviewFloorId, litUnitIds };
}

import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { PublicUnit } from '../../../../types';
import { useFloorPreview } from './useFloorPreview';

const unit = (id: string, floorId: string) => ({ id, floorId }) as PublicUnit;
const units = new Map([['a', unit('a', 'f1')], ['b', unit('b', 'f1')], ['c', unit('c', 'f2')]]);

describe('useFloorPreview', () => {
  it('lights the homes of the floor pointed at, and reports each floor pointed at', () => {
    const onPoint = vi.fn();
    const { result } = renderHook(() => useFloorPreview(units, onPoint));
    expect(result.current.litUnitIds).toBeUndefined();
    act(() => result.current.setPreviewFloorId('f1'));
    expect([...(result.current.litUnitIds ?? [])]).toEqual(['a', 'b']);
    expect(onPoint).toHaveBeenCalledWith('f1');
    act(() => result.current.setPreviewFloorId(null));
    expect(result.current.litUnitIds).toBeUndefined();
    expect(onPoint).toHaveBeenCalledTimes(1);
  });
});

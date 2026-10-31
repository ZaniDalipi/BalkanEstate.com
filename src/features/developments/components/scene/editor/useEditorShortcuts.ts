/**
 * Keyboard shortcuts of the region editor. Active while focus is inside the
 * editor (or on the page body), never while typing in a field.
 *
 * Ctrl/Cmd+Z undo · Shift+Ctrl/Cmd+Z or Ctrl+Y redo · Delete/Backspace delete
 * vertex or region · arrows nudge (Shift ×10) · Escape cancel drawing, then
 * deselect · Enter finish polygon · D duplicate · V/R/P tools.
 */
import { useEffect, useRef } from 'react';
import type React from 'react';
import type { HotspotLinkType } from '../../../types';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';

export const NUDGE_STEP = 0.001;

const isTyping = (el: Element | null): boolean => {
  const node = el as HTMLElement | null;
  if (!node || !node.tagName) return false;
  return node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT' || node.isContentEditable;
};

interface Options {
  editor: PolygonEditor;
  rootRef: React.RefObject<HTMLElement | null>;
  linkType: HotspotLinkType;
  enabled: boolean;
}

export function useEditorShortcuts({ editor, rootRef, linkType, enabled }: Options) {
  const live = useRef({ editor, linkType });
  live.current = { editor, linkType };

  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (isTyping(e.target as Element) || isTyping(active)) return;
      const root = rootRef.current;
      if (active && active !== document.body && root && !root.contains(active)) return;
      const { editor: ed, linkType: lt } = live.current;
      const { state, dispatch, nextId } = ed;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'REDO' : 'UNDO' });
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }
      if (mod || e.altKey) return;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (!state.selectedId) return;
          e.preventDefault();
          dispatch({ type: 'DELETE_SELECTED' });
          return;
        case 'Escape':
          if (state.drawing) dispatch({ type: 'DRAW_CANCEL' });
          else dispatch({ type: 'SELECT', id: null });
          return;
        case 'Enter':
          if (state.drawing && active?.tagName !== 'BUTTON') {
            e.preventDefault();
            dispatch({ type: 'DRAW_FINISH', id: nextId(), linkType: lt });
          }
          return;
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          if (!state.selectedId) return;
          e.preventDefault();
          const step = NUDGE_STEP * (e.shiftKey ? 10 : 1);
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          dispatch({ type: 'NUDGE', dx, dy });
          return;
        }
        default:
          break;
      }
      if (key === 'd' && state.selectedId) dispatch({ type: 'DUPLICATE', id: state.selectedId, newId: nextId() });
      else if (key === 'v') dispatch({ type: 'SET_TOOL', tool: 'select' });
      else if (key === 'r') dispatch({ type: 'SET_TOOL', tool: 'rect' });
      else if (key === 'p') dispatch({ type: 'SET_TOOL', tool: 'polygon' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, rootRef]);
}

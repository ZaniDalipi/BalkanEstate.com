import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import type { HotspotLinkType } from '../../../types';

interface DrawControlsProps {
  editor: PolygonEditor;
  linkType: HotspotLinkType;
}

const base =
  'inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 sm:min-h-9';

/**
 * Finish / Cancel for an in-progress polygon, floated over the canvas so the
 * canvas never moves under the pointer while points are being placed.
 */
export const DrawControls: React.FC<DrawControlsProps> = ({ editor, linkType }) => {
  const { t } = useTranslation('developments');
  const { state, dispatch, nextId } = editor;
  if (!state.drawing) return null;
  return (
    <div className="absolute left-2 top-2 flex gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`${base} bg-primary text-white`}
        disabled={state.drawing.length < 3}
        onClick={() => dispatch({ type: 'DRAW_FINISH', id: nextId(), linkType })}
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        {t('editor.toolbar.finish', 'Finish')}
      </button>
      <button type="button" className={`${base} bg-white text-slate-700 hover:bg-slate-50`} onClick={() => dispatch({ type: 'DRAW_CANCEL' })}>
        <X className="h-4 w-4" aria-hidden="true" />
        {t('editor.toolbar.cancel', 'Cancel')}
      </button>
    </div>
  );
};

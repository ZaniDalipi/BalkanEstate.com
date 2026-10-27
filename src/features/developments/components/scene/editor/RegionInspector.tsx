import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import type { Hotspot, HotspotLinkType } from '../../../types';
import type { PolygonEditor } from '../../../hooks/usePolygonEditor';
import { ListingLinkPicker } from '../ListingLinkPicker';
import { SearchableSelect, type SelectOption } from './SearchableSelect';
import { UnitTargetPicker } from './UnitTargetPicker';
import type { UnitPickerSource } from './useLinkOptions';
import { issueText, type AnyIssueCode } from './issueText';
import { linkTypeHelp } from './linkTypeHelp';

export type LinkOptions = Record<'building' | 'floor' | 'unit' | 'entrance', SelectOption[]>;

interface RegionInspectorProps {
  developmentId: string;
  editor: PolygonEditor;
  hotspot: Hotspot;
  linkOptions: LinkOptions;
  unitPicker: UnitPickerSource;
  /** Name of the current target (resolves units beyond the loaded page). */
  targetLabel: string;
  issues: AnyIssueCode[];
}

const LINK_TYPES: HotspotLinkType[] = ['unit', 'floor', 'building', 'entrance', 'listing'];
const fieldCls =
  'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[36px]';

/** Link target, label and actions of the selected region. */
export const RegionInspector: React.FC<RegionInspectorProps> = ({
  developmentId,
  editor,
  hotspot,
  linkOptions,
  unitPicker,
  targetLabel,
  issues,
}) => {
  const { t } = useTranslation('developments');
  const { dispatch, nextId } = editor;
  const patch = (p: Partial<Pick<Hotspot, 'label' | 'linkType' | 'linkId'>>) => dispatch({ type: 'PATCH', id: hotspot.id, patch: p });
  // Entrances are only offered when the structure actually has some (or the region already uses one).
  const types = LINK_TYPES.filter((lt) => lt !== 'entrance' || linkOptions.entrance.length > 0 || hotspot.linkType === 'entrance');
  const linkTypeId = `lt-${hotspot.id}`;
  const labelId = `lb-${hotspot.id}`;

  return (
    <div className="space-y-3">
      {issues.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700" role="status">
          {issues.map((c) => (
            <li key={c} className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {issueText(t, c)}
            </li>
          ))}
        </ul>
      )}

      <div>
        <label htmlFor={linkTypeId} className="mb-1 block text-xs font-medium text-slate-600">
          {t('scene.linkType', 'Links to')}
        </label>
        <select
          id={linkTypeId}
          value={hotspot.linkType}
          onChange={(e) => patch({ linkType: e.target.value as HotspotLinkType, linkId: '' })}
          className={fieldCls}
        >
          {types.map((lt) => (
            <option key={lt} value={lt}>
              {t(`scene.linkTypes.${lt}`, lt)}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{linkTypeHelp(t, hotspot.linkType)}</p>
      </div>

      <div>
        <span className="mb-1 block text-xs font-medium text-slate-600">{t('scene.linkTarget', 'Target')}</span>
        {hotspot.linkType === 'listing' ? (
          <ListingLinkPicker
            developmentId={developmentId}
            value={hotspot.linkId}
            onPick={(id, title) => patch({ linkId: id, label: hotspot.label || title })}
            onClear={() => patch({ linkId: '' })}
          />
        ) : hotspot.linkType === 'unit' ? (
          <UnitTargetPicker
            developmentId={developmentId}
            label={t('scene.linkTarget', 'Target')}
            source={unitPicker}
            baseOptions={linkOptions.unit}
            value={hotspot.linkId}
            currentLabel={targetLabel}
            onChange={(id) => patch({ linkId: id })}
          />
        ) : (
          <SearchableSelect
            label={t('scene.linkTarget', 'Target')}
            options={linkOptions[hotspot.linkType]}
            value={hotspot.linkId}
            onChange={(id) => patch({ linkId: id })}
          />
        )}
      </div>

      <div>
        <label htmlFor={labelId} className="mb-1 block text-xs font-medium text-slate-600">
          {t('scene.label', 'Label (optional)')}
        </label>
        <input
          id={labelId}
          value={hotspot.label ?? ''}
          maxLength={80}
          onChange={(e) => patch({ label: e.target.value })}
          placeholder={t('scene.labelPlaceholder', 'e.g. Building C')}
          className={fieldCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-0" onClick={() => dispatch({ type: 'DUPLICATE', id: hotspot.id, newId: nextId() })}>
          <Copy className="mr-1 h-4 w-4" aria-hidden="true" />
          {t('editor.region.duplicate', 'Duplicate')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] text-red-600 sm:min-h-0"
          onClick={() => dispatch({ type: 'DELETE_SHAPE', id: hotspot.id })}
        >
          <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
          {t('scene.deleteRegion', 'Delete region')}
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">
        {t('editor.region.shortcuts', 'Drag to move · drag a handle to reshape · double-click an edge dot to add a point · Delete removes the selected point or region · arrows nudge (Shift ×10) · D duplicates')}
      </p>
    </div>
  );
};

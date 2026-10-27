import React, { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Upload } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { useUnitAdmin } from '../../../hooks/useUnitAdmin';
import type { DashboardUnit, UnitImage } from '../../../types';
import { useApiErrorText } from '../../../hooks/useApiErrorText';

interface FloorplanUploadProps {
  developmentId: string;
  unitId: string;
  current?: UnitImage;
  /** No upload (`media.upload` missing). */
  disabled?: boolean;
  /** May remove the current floorplan (`unit.manage`). */
  canRemove?: boolean;
  /** The unit as the server returned it after an upload or removal. */
  onUnit?: (unit: DashboardUnit) => void;
}

export const FLOORPLAN_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const FLOORPLAN_MAX_BYTES = 10 * 1024 * 1024;

/** Returns an error code, or null when the file is an acceptable floorplan image. */
export const checkFloorplanFile = (file: File): 'type' | 'size' | null =>
  !FLOORPLAN_TYPES.includes(file.type) ? 'type' : file.size > FLOORPLAN_MAX_BYTES ? 'size' : null;

/** Pick → validate → preview → upload a unit's floorplan image (uploads immediately, separate from Save). */
export const FloorplanUpload: React.FC<FloorplanUploadProps> = ({ developmentId, unitId, current, disabled, canRemove, onUnit }) => {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const inputId = useId();
  const notify = useNotification();
  const { confirm } = useConfirmation();
  const { uploadFloorplan, isUploadingFloorplan, removeFloorplan, isRemovingFloorplan } = useUnitAdmin(developmentId);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    const problem = checkFloorplanFile(picked);
    if (problem) {
      setError(
        problem === 'type'
          ? t('inventory.floorplan.badType', 'Use a JPG, PNG or WebP image.')
          : t('inventory.floorplan.tooLarge', 'The image must be 10 MB or smaller.')
      );
      return;
    }
    setError(null);
    setFile(picked);
  };

  const onUpload = async () => {
    if (!file) return;
    try {
      const res = await uploadFloorplan({ unitId, file });
      if (res?.unit) onUnit?.(res.unit);
      setFile(null);
      setPreview(null);
      void notify.success(t('inventory.floorplan.uploadedTitle', 'Floorplan uploaded'), t('inventory.floorplan.uploaded', 'The floorplan is saved.'));
    } catch (err) {
      setError(apiText.text(err));
    }
  };

  const onRemove = async () => {
    const ok = await confirm({
      title: t('inventory.floorplan.removeTitle', 'Remove the floor plan?'),
      message: t('inventory.floorplan.removeMessage', 'The floor plan image is removed from this unit.'),
      confirmLabel: t('inventory.floorplan.remove', 'Remove floor plan'),
      cancelLabel: t('wizard.cancel', 'Cancel'),
      type: 'danger',
    });
    if (!ok) return;
    setError(null);
    try {
      const res = await removeFloorplan(unitId);
      if (res?.unit) onUnit?.(res.unit);
      void notify.success(t('inventory.floorplan.removedTitle', 'Floor plan removed'), t('inventory.floorplan.removed', 'The unit no longer has a floor plan.'));
    } catch (err) {
      setError(apiText.text(err));
    }
  };

  const shown = preview ?? current?.url;

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="mb-2 text-sm font-semibold text-slate-900">{t('inventory.floorplan.title', 'Floorplan')}</p>
      {shown ? (
        <img src={shown} alt={t('inventory.floorplan.alt', 'Unit floorplan')} className="mb-2 max-h-56 w-full rounded-lg border border-slate-100 bg-slate-50 object-contain" />
      ) : (
        <p className="mb-2 text-sm text-slate-500">{t('inventory.floorplan.none', 'No floorplan yet.')}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:min-h-[40px] ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          {current?.url ? t('inventory.floorplan.replace', 'Replace image') : t('inventory.floorplan.choose', 'Choose image')}
        </label>
        <input id={inputId} type="file" accept={FLOORPLAN_TYPES.join(',')} onChange={onPick} disabled={disabled} className="sr-only" />
        {file && (
          <Button type="button" onClick={onUpload} disabled={isUploadingFloorplan}>
            {isUploadingFloorplan ? t('inventory.floorplan.uploading', 'Uploading…') : t('inventory.floorplan.upload', 'Upload floorplan')}
          </Button>
        )}
        {canRemove && current?.url && !file && (
          <Button type="button" variant="ghost" onClick={onRemove} disabled={isRemovingFloorplan} className="text-red-700 hover:bg-red-50 hover:text-red-800">
            <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
            {isRemovingFloorplan ? t('inventory.floorplan.removing', 'Removing…') : t('inventory.floorplan.remove', 'Remove floor plan')}
          </Button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};

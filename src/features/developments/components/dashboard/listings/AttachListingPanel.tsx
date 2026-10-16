import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/src/shared/components/ui/Input';
import { previewAttachment } from '../../../api/developmentsApi';
import { useListingAttachment } from '../../../hooks';
import type { AttachmentConflict, DevelopmentUnit } from '../../../types';

interface AttachListingPanelProps {
  developmentId: string;
  unit: DevelopmentUnit;
  onClose: () => void;
  onAttached: () => void;
}

/**
 * Attach an existing listing to a unit. Previews conflicts first (never
 * silently overriding), requires explicit confirmation, and only lets `force`
 * resolve non-blocking conflicts. Blocking conflicts disable attach entirely.
 */
export const AttachListingPanel: React.FC<AttachListingPanelProps> = ({
  developmentId,
  unit,
  onClose,
  onAttached,
}) => {
  const { t } = useTranslation('developments');
  const { attach, isAttaching } = useListingAttachment(developmentId);

  const [listingId, setListingId] = useState('');
  const [conflicts, setConflicts] = useState<AttachmentConflict[] | null>(null);
  const [force, setForce] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const hasBlocking = (conflicts ?? []).some((c) => c.blocking);
  const trimmedId = listingId.trim();

  const onPreview = async () => {
    if (!trimmedId) return;
    setMessage(null);
    setIsPreviewing(true);
    try {
      const result = await previewAttachment(developmentId, unit._id, trimmedId);
      setConflicts(result.conflicts);
    } catch {
      setMessage({ type: 'error', text: t('errors.generic') });
    } finally {
      setIsPreviewing(false);
    }
  };

  const onConfirm = async () => {
    if (!trimmedId || hasBlocking) return;
    setMessage(null);
    try {
      await attach({ unitId: unit._id, listingId: trimmedId, force });
      setMessage({ type: 'success', text: t('attach.success') });
      setConflicts(null);
      setListingId('');
      onAttached();
    } catch (err) {
      const e = err as { details?: { conflicts?: AttachmentConflict[] } };
      if (e?.details?.conflicts) setConflicts(e.details.conflicts);
      setMessage({ type: 'error', text: t('attach.blocked') });
    }
  };

  return (
    <aside
      className="rounded-2xl border border-border bg-card p-4"
      aria-label={t('attach.title')}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {t('attach.title')} — {unit.unitNumber}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('wizard.cancel')}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <Input
        label={t('attach.listingId')}
        placeholder={t('attach.listingPlaceholder')}
        value={listingId}
        onChange={(e) => {
          setListingId(e.target.value);
          setConflicts(null);
          setMessage(null);
        }}
      />

      {conflicts && conflicts.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">{t('attach.conflictsTitle')}</p>
          <ul className="mt-1 space-y-1">
            {conflicts.map((c) => (
              <li
                key={c.code}
                className={
                  c.blocking
                    ? 'text-sm text-red-700 dark:text-red-300'
                    : 'text-sm text-amber-700 dark:text-amber-300'
                }
              >
                • {c.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {conflicts && conflicts.length === 0 && (
        <p className="mt-3 text-sm text-green-700 dark:text-green-300">{t('attach.noConflicts')}</p>
      )}

      {conflicts && !hasBlocking && conflicts.some((c) => !c.blocking) && (
        <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          {t('attach.force')}
        </label>
      )}

      {message && (
        <p
          role="status"
          className={
            message.type === 'success'
              ? 'mt-3 text-sm text-green-700 dark:text-green-300'
              : 'mt-3 text-sm text-red-700 dark:text-red-300'
          }
        >
          {message.text}
        </p>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onPreview}
          disabled={!trimmedId || isPreviewing}
        >
          {t('attach.preview')}
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={!trimmedId || isAttaching || hasBlocking}
        >
          {isAttaching ? t('attach.attaching') : t('attach.confirm')}
        </Button>
      </div>
    </aside>
  );
};

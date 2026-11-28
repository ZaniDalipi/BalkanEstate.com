import React from 'react';
import { useTranslation } from 'react-i18next';

/** Shown until this view has a linked floor to copy from: the three steps, and why linking matters. */
export const AutoFloorsHowTo: React.FC<{ unlinked: number }> = ({ unlinked }) => {
  const { t } = useTranslation('developments');
  return (
    <div role="status" className="space-y-1.5 rounded-lg bg-white p-2 text-xs text-slate-700">
      <p className="font-medium text-slate-900">{t('editor.autoFloors.howTitle', 'How it works')}</p>
      <ol className="list-decimal space-y-1 pl-4">
        <li>{t('editor.autoFloors.how1', 'Draw the apartments of Floor 1 on the picture. On a photo taken at an angle, also draw Floor 2: each apartment column is then measured.')}</li>
        <li>{t('editor.autoFloors.how2', 'Select each region and link it to its apartment, so it is known which floor it is on.')}</li>
        <li>{t('editor.autoFloors.how3', 'Come back here and press Add: the other floors get the same outlines, linked to the apartments with the same number (A-102 → A-202).')}</li>
      </ol>
      {unlinked > 0 && (
        <p className="text-amber-700">
          {t('editor.autoFloors.unlinked', { count: unlinked, defaultValue: '{{count}} regions on this view have no link yet. Link them to their apartments first.' })}
        </p>
      )}
    </div>
  );
};

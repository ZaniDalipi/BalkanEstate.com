import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ImportRowPayload } from '../../../../utils/csvImport';
import { formatArea, formatPrice } from '../../../../utils/format';

/** The first rows exactly as they will be imported, so floors and prices can be checked at a glance. */
export const RowsPreview: React.FC<{ rows: ImportRowPayload[] }> = ({ rows }) => {
  const { t } = useTranslation('developments');
  if (rows.length === 0) return null;
  const head = 'px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500';
  const cell = 'px-2 py-1.5 text-sm text-slate-800';
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[560px]">
        <caption className="sr-only">{t('import.previewCaption', 'First rows as they will be imported')}</caption>
        <thead className="bg-slate-50">
          <tr>
            <th className={head}>{t('unit.number')}</th>
            <th className={head}>{t('import.field.building', 'Building')}</th>
            <th className={head}>{t('import.field.floor', 'Floor')}</th>
            <th className={head}>{t('unit.type')}</th>
            <th className={head}>{t('unit.area')}</th>
            <th className={head}>{t('unit.price')}</th>
            <th className={head}>{t('unit.availability')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.slice(0, 6).map((r) => (
            <tr key={r.row}>
              <td className={`${cell} font-medium`}>{r.unitNumber}</td>
              <td className={cell}>{r.building}</td>
              <td className={cell}>{r.floorLabel}</td>
              <td className={cell}>{r.fields.unitType ? t(`explorer.unitType.${r.fields.unitType}`, String(r.fields.unitType)) : '—'}</td>
              <td className={cell}>{typeof r.fields.totalArea === 'number' ? formatArea(r.fields.totalArea) : '—'}</td>
              <td className={cell}>{typeof r.fields.price === 'number' ? formatPrice(r.fields.price, String(r.fields.currency ?? 'EUR')) : '—'}</td>
              <td className={cell}>{r.fields.availability ? t(`availability.${r.fields.availability}`, String(r.fields.availability)) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 6 && <p className="border-t border-slate-100 px-2 py-1.5 text-xs text-slate-500">{t('import.moreRows', { n: rows.length - 6, defaultValue: '…and {{n}} more' })}</p>}
    </div>
  );
};

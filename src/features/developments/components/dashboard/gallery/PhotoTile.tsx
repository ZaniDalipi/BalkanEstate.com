import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';

interface PhotoTileProps {
  url: string;
  index: number;
  count: number;
  disabled: boolean;
  onMove: (to: number) => void;
  onRemove: () => void;
}

const btn = 'inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** One gallery photo with its position and buttons to move it earlier or later, or remove it. */
export const PhotoTile: React.FC<PhotoTileProps> = ({ url, index, count, disabled, onMove, onRemove }) => {
  const { t } = useTranslation('developments');
  const n = index + 1;
  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="relative aspect-[4/3] bg-slate-100">
        <img src={optimizeImageUrl(url, { width: 400, height: 300 })} alt={t('gallery.photoAlt', { n, defaultValue: 'Photo {{n}}' })} loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">{n}</span>
      </div>
      <div className="flex items-center justify-between px-1">
        <div className="flex">
          <button type="button" className={btn} disabled={disabled || index === 0} onClick={() => onMove(index - 1)} aria-label={t('gallery.moveEarlier', { n, defaultValue: 'Move photo {{n}} earlier' })}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" className={btn} disabled={disabled || index === count - 1} onClick={() => onMove(index + 1)} aria-label={t('gallery.moveLater', { n, defaultValue: 'Move photo {{n}} later' })}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <button type="button" className={`${btn} hover:text-red-700`} disabled={disabled} onClick={onRemove} aria-label={t('gallery.remove', { n, defaultValue: 'Remove photo {{n}}' })}>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
};

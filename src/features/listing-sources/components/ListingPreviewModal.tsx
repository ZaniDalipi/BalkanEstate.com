import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { PreviewListing } from '../api/listingSourceApi';

interface ListingPreviewModalProps {
  sourceName: string;
  previewId: string;
  items?: PreviewListing[];
  onConfirm: (approvedIds: string[]) => void;
  onCancel: () => void;
  isConfirming: boolean;
}

const formatPrice = (price?: number): string => {
  if (!price) return '';
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
};

interface PreviewCardProps {
  item: PreviewListing;
  checked: boolean;
  onToggle: () => void;
}

const PreviewCard: React.FC<PreviewCardProps> = ({ item, checked, onToggle }) => {
  const { t } = useTranslation('listingFeeds');
  const [imgFailed, setImgFailed] = useState(false);

  const meta: string[] = [];
  if (item.city) meta.push(item.city + (item.country ? `, ${item.country}` : ''));
  if (item.propertyType) meta.push(item.propertyType);
  if (item.beds != null) meta.push(`${item.beds} ${t('preview.beds')}`);
  if (item.baths != null) meta.push(`${item.baths} ${t('preview.baths')}`);
  if (item.sqft != null) meta.push(`${item.sqft} m²`);

  return (
    <label
      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors select-none ${
        checked ? 'bg-primary/5 border-primary/30' : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-4 h-4 flex-shrink-0 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/30"
      />

      {/* Thumbnail — show placeholder when no image or load error */}
      <div className="w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
        {item.imageUrl && !imgFailed ? (
          <img
            src={item.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              points="9 22 9 12 15 12 15 22" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-gray-900 line-clamp-1">
            {item.title || t('preview.untitled')}
          </span>
          <span
            className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${
              item.isNew ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {item.isNew ? t('preview.badgeNew') : t('preview.badgeUpdate')}
          </span>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
          {item.price != null && (
            <span className="font-semibold text-gray-800">{formatPrice(item.price)}</span>
          )}
          {meta.map((m, i) => (
            <span key={i} className="capitalize">{m}</span>
          ))}
          {meta.length === 0 && item.sourceUrl && (
            <span className="truncate text-gray-400 max-w-[200px]">{item.sourceUrl}</span>
          )}
        </div>
      </div>
    </label>
  );
};

const ListingPreviewModal: React.FC<ListingPreviewModalProps> = ({
  sourceName,
  previewId: _previewId,
  items: itemsProp,
  onConfirm,
  onCancel,
  isConfirming,
}) => {
  const { t } = useTranslation('listingFeeds');
  const items = useMemo<PreviewListing[]>(
    () => (Array.isArray(itemsProp) ? itemsProp : []),
    [itemsProp]
  );

  // Initialize to all-selected after mount to avoid stale-closure issues with
  // React's lazy useState initialiser when items arrive from async state.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSelected(new Set(items.map((i) => i.rawId)));
  }, [items]);

  const newCount = useMemo(() => items.filter((i) => i.isNew).length, [items]);
  const updateCount = items.length - newCount;

  const isAllSelected = items.length > 0 && selected.size === items.length;
  const isSomeSelected = selected.size > 0 && selected.size < items.length;

  const toggleItem = useCallback((rawId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rawId)) next.delete(rawId);
      else next.add(rawId);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(isAllSelected ? new Set() : new Set(items.map((i) => i.rawId)));
  }, [isAllSelected, items]);

  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(selected));
  }, [selected, onConfirm]);

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('preview.modalLabel')}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={isConfirming ? undefined : onCancel}
      />

      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('preview.title')}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {t('preview.subtitle', { source: sourceName, total: items.length })}
              </p>
            </div>
            {!isConfirming && (
              <button
                type="button"
                onClick={onCancel}
                aria-label={t('common:close')}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none font-bold flex-shrink-0"
              >×</button>
            )}
          </div>

          {items.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {newCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  {t('preview.newCount', { count: newCount })}
                </span>
              )}
              {updateCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                  {t('preview.updateCount', { count: updateCount })}
                </span>
              )}
              <span className="ml-auto text-xs text-gray-500">
                {t('preview.selectedCount', { count: selected.size, total: items.length })}
              </span>
            </div>
          )}
        </div>

        {/* Select-all toolbar */}
        {items.length > 0 && (
          <div className="px-6 py-2 border-b border-gray-100 flex items-center gap-3 bg-gray-50">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-sm text-gray-700">
                {isAllSelected ? t('preview.deselectAll') : t('preview.selectAll')}
              </span>
            </label>
          </div>
        )}

        {/* Item list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">{t('preview.empty')}</p>
          ) : (
            items.map((item) => (
              <PreviewCard
                key={item.rawId}
                item={item}
                checked={selected.has(item.rawId)}
                onToggle={() => toggleItem(item.rawId)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {t('preview.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selected.size === 0 || isConfirming}
            className="px-5 py-2 text-sm rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isConfirming && (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {selected.size === 0
              ? t('preview.noSelection')
              : t('preview.confirmImport', { count: selected.size })}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default ListingPreviewModal;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeImageUrl } from '@/config/mediaConfig';
import type { ArchivedListing } from '../../api/archivedListingsAdminApi';
import { REASON_LABEL, REASON_STYLE, REMOVED_BY_LABEL, archiveActorName, archivePlace, archivePrice } from './archiveDisplay';

interface ArchivedListingCardProps {
  listing: ArchivedListing;
}

/** One archived listing: what it was, who removed it and when. */
export const ArchivedListingCard: React.FC<ArchivedListingCardProps> = ({ listing }) => {
  const { t, i18n } = useTranslation(['admin']);
  const price = archivePrice(listing, i18n.language);
  const place = archivePlace(listing);
  const actor = archiveActorName(listing);
  const date = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { dateStyle: 'medium' });
  const thumb = listing.mediaPurgedAt ? undefined : listing.thumbnailUrl;

  return (
    <li className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <div className="h-20 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {thumb && (
          <img src={optimizeImageUrl(thumb, { width: 160 })} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${REASON_STYLE[listing.archiveReason]}`}>
            {t(`admin:archive.reason.${listing.archiveReason}`, REASON_LABEL[listing.archiveReason])}
          </span>
          <h3 className="min-w-0 truncate font-semibold text-gray-900">
            {listing.title || t('admin:archive.untitled', 'Untitled listing')}
          </h3>
        </div>
        <p className="text-gray-700">{[price, place].filter(Boolean).join(' · ')}</p>
        <p className="text-gray-600">
          {t('admin:archive.seller', { name: listing.sellerName, email: listing.sellerEmail, defaultValue: 'Seller: {{name}} ({{email}})' })}
        </p>
        <p className="text-gray-600">
          {listing.deletedBy
            ? t(`admin:archive.removedBy.${listing.deletedBy.kind}`, {
                name: actor ?? '—',
                date: date(listing.archivedAt),
                defaultValue: REMOVED_BY_LABEL[listing.deletedBy.kind],
              })
            : t('admin:archive.archivedOn', { date: date(listing.archivedAt), defaultValue: 'Archived on {{date}}' })}
        </p>
        <p className="text-xs text-gray-500">
          {t('admin:archive.stats', {
            days: listing.daysOnMarket,
            views: listing.totalViews,
            saves: listing.totalSaves,
            defaultValue: '{{days}} days listed · {{views}} views · {{saves}} saves',
          })}
          {listing.previousStatus && ` · ${t('admin:archive.wasStatus', { status: t(`admin:archive.status.${listing.previousStatus}`, listing.previousStatus), defaultValue: 'was {{status}}' })}`}
        </p>
      </div>
    </li>
  );
};

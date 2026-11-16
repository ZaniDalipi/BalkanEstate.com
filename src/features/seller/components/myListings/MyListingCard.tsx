import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { PencilIcon, TrashIcon } from '@/constants';
import type { Property } from '@/types';
import { formatPrice } from '@/utils/currency';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import ManageOpenHouses from '@/src/features/open-houses/components/ManageOpenHouses';
import { SoftIcon } from '@/src/shared/illustrations';
import { decodeHtmlEntities } from '@/src/shared/utils/sanitize';
import type { ListingFeedback } from '../../hooks/useListingTasks';
import type { ListingTaskId } from '../../utils/listingActionFeedback';
import { buildListingActions, isListingActionable, type ListingActionId, type RenewalStatus } from '../../utils/listingActions';
import { ListingActionBar } from '../listingActions';
import { ListingTypeBadge, NoMapLocationBadge, RoleBadge, StatusBadge } from './ListingBadges';
import { ListingStats } from './ListingStats';

interface MyListingCardProps {
  property: Property;
  canReassignToAgency: boolean;
  renewalStatus: RenewalStatus | null;
  /** What the card is doing right now, if anything. */
  pendingTask: ListingTaskId | null;
  feedback: ListingFeedback | null;
  onAction: (action: ListingActionId, propertyId: string) => void;
  onDelete: (propertyId: string) => void;
  onDismissFeedback: (propertyId: string) => void;
}

const ICON_BUTTON = 'flex h-[44px] w-[44px] items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * One of the seller's own listings. Laid out by the card's width (container
 * queries), not the screen's: stacked on a phone, a thumbnail beside the
 * heading on a tablet, and a photo column beside everything on a desktop.
 */
export const MyListingCard: React.FC<MyListingCardProps> = ({
  property, canReassignToAgency, renewalStatus, pendingTask, feedback, onAction, onDelete, onDismissFeedback,
}) => {
  const { t } = useTranslation(['seller', 'account', 'property']);
  const [imageError, setImageError] = useState(false);

  const open = () => navigate(paths.property(property.id), { state: { property } });
  const edit = () => navigate(paths.editListing(property.id), { state: { property } });

  const isActionable = isListingActionable(property.status);
  const actions = buildListingActions({
    status: property.status,
    listingType: property.listingType,
    createdAsRole: property.createdAsRole,
    isPromoted: property.isPromoted,
    promotionEndDate: property.promotionEndDate,
    imageCount: property.images?.length ?? 0,
    hasVideo: Boolean(property.videoUrl),
    canReassignToAgency,
    renewal: renewalStatus,
  });
  const hasMapLocation = Number.isFinite(property.lat) && Number.isFinite(property.lng);
  const deleting = pendingTask === 'delete';
  const place = decodeHtmlEntities([property.address, property.city].filter(Boolean).join(', '));
  const price = property.isNegotiable
    ? t('property:byNegotiation', 'By Negotiation')
    : formatPrice(property.price, property.country);

  return (
    <article
      aria-busy={deleting || undefined}
      className={`@container rounded-2xl border border-neutral-200 bg-white p-3 transition-shadow duration-300 hover:shadow-lg sm:p-4 ${deleting ? 'pointer-events-none opacity-60' : ''}`}
    >
      <div className="grid gap-x-4 gap-y-3 @md:grid-cols-[8.5rem_minmax(0,1fr)] @3xl:grid-cols-[14rem_minmax(0,1fr)] @3xl:gap-x-5">
        <button
          type="button"
          onClick={open}
          aria-label={t('seller:myListings.openListing', 'Open listing')}
          className="block h-44 w-full overflow-hidden rounded-xl bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary @md:h-28 @3xl:row-span-2 @3xl:h-full @3xl:min-h-44"
        >
          {imageError || !property.imageUrl ? (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-300">
              <SoftIcon name="building" className="h-12 w-12" />
            </span>
          ) : (
            <img
              src={optimizeImageUrl(property.imageUrl, { width: 640 }) || property.imageUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover object-center"
              onError={() => setImageError(true)}
            />
          )}
        </button>

        <div className="flex min-w-0 items-start justify-between gap-2">
          <div onClick={open} className="min-w-0 cursor-pointer">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={property.status} />
              <ListingTypeBadge listingType={property.listingType} />
              <RoleBadge role={property.createdAsRole} />
              {!hasMapLocation && <NoMapLocationBadge />}
            </div>
            {property.propertyId && (
              <span className="inline-flex rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs font-medium text-neutral-600" title={t('seller:myListings.propertyIdLabel', 'Property ID')}>
                ID: {property.propertyId}
              </span>
            )}
            {property.title && (
              <p className="mt-1 line-clamp-2 break-words text-lg font-bold text-neutral-900 @3xl:line-clamp-1 @3xl:text-xl">{property.title}</p>
            )}
            <p className={`mt-0.5 font-bold text-primary ${property.title ? 'text-base' : 'text-lg @3xl:text-xl'}`}>{price}</p>
            <p className="line-clamp-2 break-words text-sm text-neutral-600">{place}</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={edit} aria-label={t('account:ui.myListings.editListing', 'Edit listing')} className={`${ICON_BUTTON} bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800`}>
              <PencilIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onDelete(property.id)} aria-label={t('account:ui.myListings.deleteListing', 'Delete listing')} className={`${ICON_BUTTON} bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700`}>
              {deleting
                ? <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" aria-hidden="true" />
                : <TrashIcon className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="min-w-0 @md:col-span-2 @3xl:col-span-1 @3xl:col-start-2">
          <ListingStats
            views={property.views}
            saves={property.saves}
            inquiries={property.inquiries}
            lastRenewed={isActionable ? property.lastRenewed : null}
            rentedUntil={property.status === 'rented' ? property.rentedUntil : null}
          />
          <ListingActionBar
            actions={actions}
            onAction={(action) => onAction(action, property.id)}
            onEdit={edit}
            pendingTask={pendingTask}
            feedback={feedback}
            onDismissFeedback={() => onDismissFeedback(property.id)}
          />
          {/* Optional: plan open houses and see who's coming */}
          {property.status === 'active' && (
            <div className="mt-3">
              <ManageOpenHouses propertyId={property.id} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

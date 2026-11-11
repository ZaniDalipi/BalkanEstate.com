import type { ArchivedListing, ArchiveDeletedBy, ArchiveReason } from '../../api/archivedListingsAdminApi';

/** English defaults for the translated labels. */
export const REASON_LABEL: Record<ArchiveReason, string> = { deleted: 'Deleted', sold: 'Sold', rented: 'Rented' };
export const DELETER_LABEL: Record<ArchiveDeletedBy, string> = { owner: 'The owner', admin: 'An admin', agency: 'The agency' };
export const REMOVED_BY_LABEL: Record<ArchiveDeletedBy, string> = {
  owner: 'Removed on {{date}} by the owner ({{name}})',
  admin: 'Removed on {{date}} by admin {{name}}',
  agency: 'Removed on {{date}} by the agency ({{name}})',
};

/** Badge colours per archive reason. */
export const REASON_STYLE: Record<ArchiveReason, string> = {
  deleted: 'bg-red-50 text-red-700 ring-red-200',
  sold: 'bg-green-50 text-green-700 ring-green-200',
  rented: 'bg-blue-50 text-blue-700 ring-blue-200',
};

/** The price that matters: the final sale price when there was one. */
export function archivePrice(listing: Pick<ArchivedListing, 'price' | 'salePrice' | 'listingType'>, locale: string): string | null {
  const value = listing.salePrice && listing.salePrice > 0 ? listing.salePrice : listing.price;
  if (!Number.isFinite(value) || value <= 0) return null;
  const amount = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  return listing.listingType === 'rent' ? `${amount}/mo` : amount;
}

/** "Durrës, Albania" without empty or placeholder parts. */
export function archivePlace(listing: Pick<ArchivedListing, 'address' | 'city' | 'country'>): string {
  return [listing.address, listing.city, listing.country]
    .filter((part) => part && part !== 'Unknown')
    .join(', ');
}

/** Who removed it, as shown on the card: a name or email when known. */
export function archiveActorName(listing: Pick<ArchivedListing, 'deletedBy'>): string | null {
  const by = listing.deletedBy;
  if (!by) return null;
  return by.name?.trim() || by.email?.trim() || null;
}

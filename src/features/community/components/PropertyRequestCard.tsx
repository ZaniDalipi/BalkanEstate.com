import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PropertyRequest } from '../api/propertyRequests';

interface PropertyRequestCardProps {
  request: PropertyRequest;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  any: 'Any Type',
  house: 'House',
  apartment: 'Apartment',
  villa: 'Villa',
  land: 'Land',
  other: 'Other',
};

const PropertyRequestCard: React.FC<PropertyRequestCardProps> = ({ request }) => {
  const { t } = useTranslation('community');

  const listingLabel = request.listingType === 'sale'
    ? t('request.buy', 'Buy')
    : t('request.rent', 'Rent');

  const location = [request.city, request.country].filter(Boolean).join(', ');
  const priceRange = [];
  if (request.minPrice) priceRange.push(`€${request.minPrice.toLocaleString()}`);
  if (request.maxPrice) priceRange.push(`€${request.maxPrice.toLocaleString()}`);

  const timeAgo = getTimeAgo(new Date(request.createdAt));

  return (
    <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
            request.listingType === 'sale'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {listingLabel}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 text-neutral-600">
            {PROPERTY_TYPE_LABELS[request.propertyType] || request.propertyType}
          </span>
        </div>
        <span className="text-xs text-neutral-400 whitespace-nowrap">{timeAgo}</span>
      </div>

      {location && (
        <div className="flex items-center gap-1.5 text-sm text-neutral-700 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          {location}
        </div>
      )}

      {priceRange.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-neutral-700 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          {priceRange.join(' - ')}
        </div>
      )}

      {request.minBeds && (
        <div className="flex items-center gap-1.5 text-sm text-neutral-700 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          {request.minBeds}+ {t('request.beds', 'beds')}
        </div>
      )}

      {request.additionalNotes && (
        <p className="text-sm text-neutral-600 mt-3 line-clamp-2 italic">
          "{request.additionalNotes}"
        </p>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100">
        <span className="text-xs text-neutral-500">
          {t('request.by', 'By')} {request.name}
        </span>
        <div className="flex items-center gap-1.5">
          {request.source === 'telegram' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-50 text-sky-600">
              Telegram
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default PropertyRequestCard;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import type { FeedSampleListing } from '../../types/propertyImports';
import { formatPrice } from './formatters';

/** How the first listings will read once imported. */
const SampleListings: React.FC<{ samples: FeedSampleListing[] }> = ({ samples }) => {
  const { t } = useTranslation(['agencyDashboard']);
  if (samples.length === 0) return null;
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {samples.map((s) => (
        <li key={s.externalId} className="flex gap-3 rounded-lg border border-gray-200 p-3">
          {s.imageUrls[0] && (
            <img src={optimizeCloudinaryUrl(s.imageUrls[0], { width: 160 })} alt="" loading="lazy" className="w-20 h-20 rounded-md object-cover bg-gray-100 shrink-0" />
          )}
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-gray-900 truncate">{s.title}</p>
            <p className="text-gray-600 truncate">
              {s.address}
              {s.addressPrivate && ` · ${t('agencyDashboard:imports.preview.addressHidden', 'exact address hidden')}`}
            </p>
            <p className="text-gray-900 font-medium">
              {s.price > 0 ? formatPrice(s.price) : t('agencyDashboard:imports.preview.priceOnRequest', 'Price on request')}
              <span className="text-gray-500 font-normal"> · {s.listingType === 'rent' ? t('agencyDashboard:imports.preview.rent', 'Rent') : t('agencyDashboard:imports.preview.sale', 'Sale')} · {s.propertyType}</span>
            </p>
            <p className="text-xs text-gray-500">
              {[s.sqft ? `${s.sqft} m²` : null, s.beds !== undefined ? `${s.beds} bd` : null, s.baths !== undefined ? `${s.baths} ba` : null, `${s.imageUrls.length} 📷`]
                .filter(Boolean)
                .join(' · ')}{' '}
              <span className="font-mono">#{s.externalId}</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default SampleListings;

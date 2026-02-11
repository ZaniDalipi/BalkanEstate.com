// Common Property UI Components
// Reusable UI components for property displays

import React from 'react';
import { Property } from '../../../types';
import { optimizeCloudinaryUrl } from '../../../config/cloudinaryConfig';

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

/**
 * DetailItem - Display property detail with icon
 *
 * Usage:
 * ```tsx
 * <DetailItem icon={<BedIcon />} label="Bedrooms">
 *   3
 * </DetailItem>
 * ```
 */
export const DetailItem: React.FC<DetailItemProps> = ({ icon, label, children }) => (
  <div className="group relative overflow-hidden rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:bg-white/70 transition-all duration-300">
    {/* Glass top highlight */}
    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/90 to-transparent" />

    <div className="relative p-3.5 flex items-center gap-3">
      {/* Frosted glass icon */}
      <div className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center text-primary/70 group-hover:text-primary transition-colors duration-300">
        <div className="w-[18px] h-[18px] flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>span]:text-sm">
          {icon}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-[11px] text-neutral-400 font-medium block leading-tight">{label}</span>
        <span className="text-sm font-semibold text-neutral-800 block leading-tight mt-0.5">{children}</span>
      </div>
    </div>
  </div>
);

interface ThumbnailProps {
  src: string;
  alt: string;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Thumbnail - Image thumbnail with active state
 *
 * Usage:
 * ```tsx
 * <Thumbnail
 *   src={image.url}
 *   alt="Property"
 *   isActive={currentIndex === index}
 *   onClick={() => setCurrentIndex(index)}
 * />
 * ```
 */
export const Thumbnail: React.FC<ThumbnailProps> = ({ src, alt, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`relative flex-shrink-0 aspect-[4/3] rounded-xl overflow-hidden border-3 transition-all duration-300 ${
      isActive
        ? 'border-primary ring-2 ring-primary/30 scale-[1.02] shadow-lg'
        : 'border-transparent opacity-60 hover:opacity-100 hover:scale-[1.01]'
    }`}
  >
    <img src={optimizeCloudinaryUrl(src, { width: 200, quality: 'auto', crop: 'fill' })} alt={alt} loading="lazy" decoding="async" width={200} height={200} className="w-full h-full object-cover" />
    {isActive && (
      <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
    )}
  </button>
);

interface PropertyBadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

/**
 * PropertyBadge - Colored badge for property status/features
 *
 * Usage:
 * ```tsx
 * <PropertyBadge variant="success">For Sale</PropertyBadge>
 * <PropertyBadge variant="warning">Pending</PropertyBadge>
 * ```
 */
export const PropertyBadge: React.FC<PropertyBadgeProps> = ({
  children,
  variant = 'primary',
}) => {
  const variantClasses = {
    primary: 'bg-primary text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-amber-500 text-white',
    danger: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
};

interface PropertyPriceProps {
  price: number;
  currency?: string;
  className?: string;
}

/**
 * PropertyPrice - Formatted property price display
 *
 * Usage:
 * ```tsx
 * <PropertyPrice price={250000} />
 * <PropertyPrice price={1500} currency="€/month" />
 * ```
 */
export const PropertyPrice: React.FC<PropertyPriceProps> = ({
  price,
  currency = '€',
  className = '',
}) => {
  const formatted = new Intl.NumberFormat('en-US').format(price);

  return (
    <div className={`text-2xl font-bold text-primary ${className}`}>
      {currency}
      {formatted}
    </div>
  );
};

interface PropertyFeatureListProps {
  features: string[];
  maxDisplay?: number;
}

/**
 * PropertyFeatureList - Display property features as list
 *
 * Usage:
 * ```tsx
 * <PropertyFeatureList
 *   features={['Parking', 'Garden', 'Balcony']}
 *   maxDisplay={5}
 * />
 * ```
 */
export const PropertyFeatureList: React.FC<PropertyFeatureListProps> = ({
  features,
  maxDisplay,
}) => {
  const displayFeatures = maxDisplay ? features.slice(0, maxDisplay) : features;
  const remaining = maxDisplay && features.length > maxDisplay ? features.length - maxDisplay : 0;

  return (
    <ul className="space-y-2">
      {displayFeatures.map((feature, index) => (
        <li key={index} className="flex items-center gap-2 text-sm text-neutral-700">
          <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
          {feature}
        </li>
      ))}
      {remaining > 0 && (
        <li className="text-sm text-neutral-500 italic">+ {remaining} more features</li>
      )}
    </ul>
  );
};

// Export all components
export default {
  DetailItem,
  Thumbnail,
  PropertyBadge,
  PropertyPrice,
  PropertyFeatureList,
};

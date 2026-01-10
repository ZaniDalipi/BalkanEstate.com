// Common Property UI Components
// Reusable UI components for property displays

import React from 'react';
import { Property } from '../../../types';

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
  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-neutral-50 to-neutral-100/50 border border-neutral-200/60 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide block">{label}</span>
      <span className="text-sm font-bold text-neutral-800 block truncate">{children}</span>
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
    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
      isActive ? 'border-primary scale-105' : 'border-transparent opacity-70 hover:opacity-100'
    }`}
  >
    <img src={src} alt={alt} className="w-full h-full object-cover" />
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

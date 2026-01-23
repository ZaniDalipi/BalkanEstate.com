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
  <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-500 hover:-translate-y-1">
    {/* Liquid glass highlight effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-2xl" />
    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />

    {/* Subtle color tint on hover */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-blue-500/3 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

    <div className="relative p-4 flex items-center gap-4">
      {/* Apple-style liquid glass icon container */}
      <div className="relative flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/90 to-primary shadow-lg shadow-primary/25 flex items-center justify-center text-white group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-500">
        {/* Glass reflection */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="absolute top-0 left-1 right-1 h-[40%] rounded-t-xl bg-gradient-to-b from-white/25 to-transparent" />
        <div className="relative w-5 h-5 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
          {icon}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-0.5">{label}</span>
        <span className="text-sm sm:text-base font-bold text-neutral-800 block leading-tight">{children}</span>
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

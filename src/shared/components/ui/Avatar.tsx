import React from 'react';
import { User } from 'lucide-react';
import { optimizeCloudinaryUrl } from '../../../../config/cloudinaryConfig';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

const iconSizes: Record<AvatarSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

const pixelWidths: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  name,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = React.useState(false);

  if (src && !imageError) {
    // Request 2x the display size for retina screens
    const optimizedSrc = optimizeCloudinaryUrl(src, { width: pixelWidths[size] * 2, quality: 'auto', crop: 'fill' });
    const displaySize = pixelWidths[size];
    return (
      <img
        src={optimizedSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={displaySize}
        height={displaySize}
        className={`
          rounded-full object-cover
          ${sizeClasses[size]}
          ${className}
        `}
        onError={() => setImageError(true)}
      />
    );
  }

  if (name) {
    return (
      <div
        className={`
          rounded-full bg-primary/10 text-primary font-medium
          flex items-center justify-center
          ${sizeClasses[size]}
          ${className}
        `}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div
      className={`
        rounded-full bg-gray-100 text-gray-400
        flex items-center justify-center
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <User size={iconSizes[size]} />
    </div>
  );
};

export interface AvatarGroupProps {
  avatars: Array<{ src?: string; name?: string }>;
  max?: number;
  size?: AvatarSize;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 4,
  size = 'md',
}) => {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          name={avatar.name}
          size={size}
          className="ring-2 ring-white"
        />
      ))}
      {remaining > 0 && (
        <div
          className={`
            rounded-full bg-gray-200 text-gray-600 font-medium
            flex items-center justify-center ring-2 ring-white
            ${sizeClasses[size]}
          `}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

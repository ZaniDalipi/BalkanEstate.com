import React from 'react';
import { buildAvatarUrl, getDefaultAvatarOptions, parseAvatarOptions, type AvatarOptions } from './AvatarCustomizer';
// Shared with the social share cards, so a shared link shows the same face.
import { generateAvatarOptionsFromSeed } from '@/config/avatarShareImage';

interface DefaultAvatarProps {
  gender?: 'male' | 'female' | 'other';
  seed?: string;
  avatarOptions?: string; // JSON string of AvatarOptions (stored in user profile)
  className?: string;
  show3d?: boolean; // Enable 3D depth effects
}

/**
 * Default avatar using DiceBear Avataaars style with 3D depth effects.
 *
 * Priority:
 * 1. If `avatarOptions` (JSON) is provided, use those exact customization settings
 * 2. If only `seed` is provided, generate a deterministic unique avatar from the seed
 * 3. Fallback to gender-based defaults
 */
const DefaultAvatar: React.FC<DefaultAvatarProps> = ({
  gender,
  seed = 'default',
  avatarOptions,
  className = 'w-full h-full',
  show3d = false,
}) => {
  // Determine which options to use
  const parsed = parseAvatarOptions(avatarOptions);
  const options: AvatarOptions = parsed
    || (seed !== 'default' ? generateAvatarOptionsFromSeed(seed, gender) : getDefaultAvatarOptions(gender));

  const url = buildAvatarUrl(options);

  if (show3d) {
    return (
      <div className={`relative ${className}`}>
        {/* Depth shadow beneath */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-b from-neutral-300/50 to-neutral-400/30 blur-xl translate-y-2 scale-95" />
        {/* Main avatar with 3D ring and glow */}
        <div className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-white/70 shadow-[0_6px_24px_rgba(0,0,0,0.18),inset_0_-2px_6px_rgba(0,0,0,0.08)] bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100">
          <img
            src={url}
            alt="Avatar"
            className="w-full h-full"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
          {/* Glossy highlight overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/35 via-transparent to-transparent pointer-events-none" />
          {/* Bottom ambient */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="Avatar"
      className={className}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
};

export default React.memo(DefaultAvatar);

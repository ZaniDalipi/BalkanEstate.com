import React, { useState } from 'react';
import DefaultAvatar from './DefaultAvatar';

interface UserAvatarProps {
  src?: string;
  alt?: string;
  className?: string;
  gender?: 'male' | 'female' | 'other';
  seed?: string;
  avatarOptions?: string;
}

/**
 * Renders a user avatar image with lazy loading and automatic
 * fallback to DefaultAvatar when the image fails to load (e.g. Google 429).
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt = 'Avatar',
  className = 'w-full h-full rounded-full object-cover',
  gender,
  seed,
  avatarOptions,
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <DefaultAvatar
        gender={gender}
        seed={seed || 'default'}
        avatarOptions={avatarOptions}
        className={className}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
};

export default React.memo(UserAvatar);

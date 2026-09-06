import React, { useEffect, useState } from 'react';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import DefaultAvatar from './DefaultAvatar';

interface UserAvatarProps {
  src?: string;
  alt?: string;
  className?: string;
  gender?: 'male' | 'female' | 'other';
  seed?: string;
  avatarOptions?: string;
  /**
   * Edge length to request the photo at, in device pixels. Only applied to
   * hosts we can resize (Cloudinary, Google) — a blob: preview or any other
   * URL is left exactly as given, so a just-picked file still shows.
   */
  width?: number;
}

/**
 * Renders a user avatar image with lazy loading and automatic
 * fallback to DefaultAvatar when the image fails to load (e.g. Google 429).
 *
 * The fallback is the person's own generated character — their saved
 * `avatarOptions` when they customised one, otherwise the face deterministically
 * generated from `seed`. Pass a stable id as the seed: seeding from a name gives
 * the same person a different face on every surface that spells it differently.
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt = 'Avatar',
  className = 'w-full h-full rounded-full object-cover',
  gender,
  seed,
  avatarOptions,
  width,
}) => {
  const [failed, setFailed] = useState(false);

  // A new photo deserves a new attempt: without this, one 404 kept the
  // generated face on screen for the rest of the session even after the
  // person uploaded a working picture.
  useEffect(() => setFailed(false), [src]);

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

  // `optimizeCloudinaryUrl` refuses anything that is not http(s) — a blob: or
  // data: preview would come back empty and drop us to the generated face.
  const resolved = width && /^https?:\/\//i.test(src)
    ? optimizeCloudinaryUrl(src, { width, quality: 'auto', crop: 'fill' })
    : src;

  return (
    <img
      src={resolved || src}
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

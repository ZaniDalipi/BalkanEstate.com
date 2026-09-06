import React from 'react';
import type { Seller } from '@/types';
import UserAvatar from '@/components/shared/UserAvatar';

interface SellerAvatarProps {
  seller?: Partial<Seller> | null;
  /**
   * Stable id for the seller — seeds the generated face. Seeding from a name
   * instead gives the same person a different face on every surface that
   * spells or truncates it differently, so pass the id wherever there is one.
   */
  seed?: string;
  /** Edge length in CSS pixels. The photo is requested at 2× for retina. */
  size: number;
  /** Ring/border chrome, which differs per surface. */
  className?: string;
}

/**
 * The seller's face, wherever a listing names who is selling it.
 *
 * Every surface used to invent its own fallback — a flat user glyph on the
 * cards, coloured initials on the detail page, a bare "?" on the rental card —
 * so one person looked like three different accounts, and a seller with no
 * uploaded photo looked like no one at all. This renders the character they
 * actually own instead: their uploaded photo, else the DiceBear avatar they
 * customised in their profile, else the one deterministically generated from
 * their id — the same face the header, agent cards and their own profile show.
 */
const SellerAvatar: React.FC<SellerAvatarProps> = ({ seller, seed, size, className = '' }) => (
  <div
    className={`relative rounded-full overflow-hidden bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 ${className}`}
    style={{ width: size, height: size }}
  >
    <UserAvatar
      src={seller?.avatarUrl}
      alt={seller?.name || ''}
      gender={seller?.gender}
      seed={seed || seller?.agentId || seller?.name}
      avatarOptions={seller?.avatarOptions}
      width={size * 2}
      className="w-full h-full object-cover object-center"
    />
    {/* Glossy highlight: the depth cue that keeps the flat SVG from reading as a sticker */}
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
  </div>
);

export default React.memo(SellerAvatar);

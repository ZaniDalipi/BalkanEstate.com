import { SOFT_ICONS, type SoftIconName } from '@/src/shared/illustrations';

// Promotion plans and special offers come from the backend with an `icon`
// field that historically held an emoji (seeded as ⭐ 💎 🏆 🏢 …). Map those to
// the soft 3D icon set; a value that is already a soft icon name is used as is.
const EMOJI_TO_SOFT_ICON: Record<string, SoftIconName> = {
  '⭐': 'star',
  '🌟': 'star',
  '✨': 'sparkles',
  '💎': 'diamond',
  '🏆': 'trophy',
  '👑': 'crown',
  '🏢': 'building',
  '🏠': 'home',
  '🏡': 'home',
  '🔥': 'flame',
  '⚡': 'bolt',
  '🚀': 'rocket',
  '🎉': 'party',
  '🎁': 'party',
  '💰': 'moneybag',
  '🏷': 'tag',
  '📣': 'megaphone',
  '📢': 'megaphone',
};

const SOFT_ICON_SET = new Set<string>(SOFT_ICONS);

export function planIconName(icon: string | undefined | null, fallback: SoftIconName): SoftIconName {
  const value = (icon ?? '').replace(/️/g, '').trim();
  if (!value) return fallback;
  if (SOFT_ICON_SET.has(value)) return value as SoftIconName;
  return EMOJI_TO_SOFT_ICON[value] ?? fallback;
}

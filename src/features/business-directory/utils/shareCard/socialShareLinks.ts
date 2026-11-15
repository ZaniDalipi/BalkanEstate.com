export type SocialNetwork = 'whatsapp' | 'facebook' | 'x' | 'linkedin' | 'telegram' | 'viber' | 'email';

export interface SocialShareLink {
  id: SocialNetwork;
  label: string;
  href: string;
}

/**
 * Share links for the networks that take a URL. Each opens the network's own
 * composer with the page link; the post's picture comes from the page's
 * link-preview card. (Instagram has no such link: the downloaded card image
 * or the phone's share sheet covers it.)
 */
export function socialShareLinks(url: string, text: string): SocialShareLink[] {
  const u = encodeURIComponent(url);
  const both = encodeURIComponent(`${text} ${url}`);
  return [
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${both}` },
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${encodeURIComponent(text)}` },
    { id: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${encodeURIComponent(text)}` },
    { id: 'viber', label: 'Viber', href: `viber://forward?text=${both}` },
    { id: 'email', label: 'Email', href: `mailto:?subject=${encodeURIComponent(text)}&body=${both}` },
  ];
}

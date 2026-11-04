import React from 'react';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';
import type { ContactChannelId } from '../../utils/contactChannels';
import { ViberIcon, WhatsAppIcon } from './brandIcons';

interface ChannelMeta {
  /** Short verb for buttons ("Call"). */
  actionKey: string;
  actionDefault: string;
  /** Row label in the contact card ("Phone"). */
  labelKey: string;
  labelDefault: string;
  Icon: React.FC<{ className?: string }>;
  /** Icon tint on glass. */
  tint: string;
}

/** The app's soft 3D icon for a channel (brands keep their own marks). */
const soft = (name: SoftIconName): React.FC<{ className?: string }> => ({ className }) => <SoftIcon name={name} className={className} />;

/** How each contact channel looks and is named, everywhere on the profile. */
export const CHANNEL_META: Record<ContactChannelId, ChannelMeta> = {
  call: { actionKey: 'detail.actions.call', actionDefault: 'Call', labelKey: 'detail.phone', labelDefault: 'Phone', Icon: soft('phone'), tint: 'text-primary' },
  whatsapp: { actionKey: 'detail.actions.whatsapp', actionDefault: 'WhatsApp', labelKey: 'detail.actions.whatsapp', labelDefault: 'WhatsApp', Icon: WhatsAppIcon, tint: 'text-[#25D366]' },
  viber: { actionKey: 'detail.actions.viber', actionDefault: 'Viber', labelKey: 'detail.actions.viber', labelDefault: 'Viber', Icon: ViberIcon, tint: 'text-[#7360F2]' },
  email: { actionKey: 'detail.actions.email', actionDefault: 'Email', labelKey: 'detail.email', labelDefault: 'Email', Icon: soft('envelope'), tint: 'text-sky-600' },
  website: { actionKey: 'detail.actions.website', actionDefault: 'Website', labelKey: 'detail.website', labelDefault: 'Website', Icon: soft('globe'), tint: 'text-indigo-600' },
  directions: { actionKey: 'detail.actions.directions', actionDefault: 'Directions', labelKey: 'detail.location', labelDefault: 'Location', Icon: soft('pin'), tint: 'text-emerald-600' },
};

/** Link attributes for a channel: web links open in a new tab, app hand-offs stay. */
export const channelLinkProps = (external: boolean): React.AnchorHTMLAttributes<HTMLAnchorElement> =>
  external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

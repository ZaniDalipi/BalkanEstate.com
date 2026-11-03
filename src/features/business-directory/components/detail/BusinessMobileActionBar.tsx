import React from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ContactChannel } from '../../utils/contactChannels';
import type { OpenStatus } from '../../utils/businessHours';
import { CHANNEL_META, channelLinkProps } from './channelMeta';
import { GLASS_BAR, PRIMARY_ACTION } from './glassStyles';
import { OpenStatusBadge } from './OpenStatusBadge';

interface BusinessMobileActionBarProps {
  visible: boolean;
  name: string;
  status: OpenStatus;
  channels: ContactChannel[];
}

/**
 * Below the desktop layout, once the action row has scrolled away, a frosted
 * bar keeps "Call" and one message channel under the thumb.
 */
export const BusinessMobileActionBar: React.FC<BusinessMobileActionBarProps> = ({ visible, name, status, channels }) => {
  const { t } = useTranslation('businessDirectory');
  const reduce = useReducedMotion();
  const call = channels.find((c) => c.id === 'call');
  const message = channels.find((c) => c.id === 'whatsapp') ?? channels.find((c) => c.id === 'viber') ?? channels.find((c) => c.id === 'email');
  if (!call && !message) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] px-3 pt-2.5 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.25)] md:left-(--sidebar-rail-w) lg:hidden ${GLASS_BAR}`}
          style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
          initial={reduce ? { opacity: 0 } : { y: '100%' }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight text-neutral-900">{name}</p>
              <OpenStatusBadge status={status} className="max-w-full truncate !text-xs" />
            </div>
            {message && (() => {
              const meta = CHANNEL_META[message.id];
              return (
                <a
                  href={message.href}
                  {...channelLinkProps(message.external)}
                  aria-label={t(meta.actionKey, meta.actionDefault)}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-black/[0.06] ${meta.tint}`}
                >
                  <meta.Icon className="h-6 w-6" />
                </a>
              );
            })()}
            {call && (
              <a href={call.href} className={`${PRIMARY_ACTION} h-12 shrink-0 px-5 text-[15px]`}>
                <CHANNEL_META.call.Icon className="h-5 w-5" />
                {t('detail.actions.call', 'Call')}
              </a>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

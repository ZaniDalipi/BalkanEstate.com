import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ScrollAssemble, ScrollAssembleItem } from '@/src/components/ui/scroll-assemble';
import { User } from '@/types';
import { NavPicture, type NavPictureName } from '@/src/shared/illustrations';

interface QuickAccessSectionProps {
  user: User;
  onNavigate: (path: string) => void;
  savedSearchesCount: number;
  savedHomesCount: number;
  unreadMessagesCount: number;
}

interface QuickLink {
  key: string;
  picture: NavPictureName;
  path: string;
  view: string;
  badge?: number;
}

const QuickAccessSection: React.FC<QuickAccessSectionProps> = ({
  user,
  onNavigate,
  savedSearchesCount,
  savedHomesCount,
  unreadMessagesCount,
}) => {
  const { t } = useTranslation(['home']);

  const links: QuickLink[] = [
    {
      key: 'savedSearches',
      picture: 'saved-searches',
      path: '/saved-searches',
      view: 'saved-searches',
      badge: savedSearchesCount || undefined,
    },
    {
      key: 'savedProperties',
      picture: 'saved',
      path: '/saved-properties',
      view: 'saved-properties',
      badge: savedHomesCount || undefined,
    },
    {
      key: 'messages',
      picture: 'inbox',
      path: '/inbox',
      view: 'inbox',
      badge: unreadMessagesCount || undefined,
    },
    {
      key: 'myAccount',
      picture: 'account',
      path: '/account',
      view: 'account',
    },
    {
      key: 'createListing',
      picture: 'new-listing',
      path: '/create-listing',
      view: 'create-listing',
    },
    {
      key: 'analytics',
      picture: 'analytics',
      path: '/analytics',
      view: 'analytics',
    },
  ];

  return (
    // overflow-x-clip: the ScrollAssemble tiles start scattered well outside
    // the content column, and this full-width section is where they get
    // clipped — see the note in scroll-assemble.tsx.
    <section className="py-8 sm:py-10 bg-white border-b border-slate-100 overflow-x-clip">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ y: 8 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-5"
        >
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {t('home:quickAccess.title')}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {t('home:quickAccess.subtitle')}
            </p>
          </div>
          <span className="text-sm text-slate-500 hidden sm:block">
            {user.name}
          </span>
        </motion.div>

        <ScrollAssemble count={links.length} className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-12 pt-8 sm:pt-20">
          {links.map((link, i) => (
            <ScrollAssembleItem key={link.key} index={i}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate(link.path)}
              className="category-dock relative flex w-full flex-col items-center pt-9 pb-3 px-2 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-md hover:z-10 bg-white transition-all group"
            >
              <NavPicture name={link.picture} className="category-dock__picture pointer-events-none absolute left-1/2 -top-7 w-14 h-14" />
              <span className="text-xs font-medium text-slate-700 text-center leading-tight">
                {t(`home:quickAccess.${link.key}`)}
              </span>
              {link.badge && link.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-slate-800 text-white text-[10px] font-bold">
                  {link.badge > 99 ? '99+' : link.badge}
                </span>
              )}
            </motion.button>
            </ScrollAssembleItem>
          ))}
        </ScrollAssemble>
      </div>
    </section>
  );
};

export default QuickAccessSection;

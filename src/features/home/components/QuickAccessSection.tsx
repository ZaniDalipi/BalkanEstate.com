import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ScrollAssemble, ScrollAssembleItem } from '@/src/components/ui/scroll-assemble';
import { User } from '@/types';

interface QuickAccessSectionProps {
  user: User;
  onNavigate: (view: string, path: string) => void;
  savedSearchesCount: number;
  savedHomesCount: number;
  unreadMessagesCount: number;
}

interface QuickLink {
  key: string;
  icon: React.ReactNode;
  path: string;
  view: string;
  badge?: number;
  color: string;
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
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      ),
      path: '/saved-searches',
      view: 'saved-searches',
      badge: savedSearchesCount || undefined,
      color: 'bg-slate-100 text-slate-600',
    },
    {
      key: 'savedProperties',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      ),
      path: '/saved-properties',
      view: 'saved-properties',
      badge: savedHomesCount || undefined,
      color: 'bg-rose-50 text-rose-600',
    },
    {
      key: 'messages',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
      ),
      path: '/inbox',
      view: 'inbox',
      badge: unreadMessagesCount || undefined,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      key: 'myAccount',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
      path: '/account',
      view: 'account',
      color: 'bg-slate-100 text-slate-600',
    },
    {
      key: 'createListing',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
      path: '/create-listing',
      view: 'create-listing',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      key: 'analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
      ),
      path: '/analytics',
      view: 'analytics',
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <section className="py-8 sm:py-10 bg-white border-b border-slate-100">
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

        <ScrollAssemble count={links.length} className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {links.map((link, i) => (
            <ScrollAssembleItem key={link.key} index={i}>
            <motion.button
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate(link.view, link.path)}
              className="relative flex w-full flex-col items-center gap-2 p-3.5 rounded-xl border border-white/30 hover:border-white/50 hover:shadow-sm bg-white/65 backdrop-blur-sm transition-all group"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${link.color}`}
              >
                {link.icon}
              </motion.div>
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

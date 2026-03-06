import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface CTASectionProps {
  onListProperty: () => void;
  onJoinAsAgent: () => void;
}

const CTASection: React.FC<CTASectionProps> = ({ onListProperty, onJoinAsAgent }) => {
  const { t } = useTranslation(['home']);

  return (
    <section className="py-12 sm:py-16 bg-neutral-50 relative overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Seller CTA */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            whileHover={{ y: -3 }}
            className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              {t('home:cta.sellerTitle')}
            </h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              {t('home:cta.sellerSubtitle')}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onListProperty}
              className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              {t('home:cta.sellerButton')}
            </motion.button>
          </motion.div>

          {/* Agent CTA */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 30 }}
            whileHover={{ y: -3 }}
            className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              {t('home:cta.agentTitle')}
            </h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              {t('home:cta.agentSubtitle')}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onJoinAsAgent}
              className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
            >
              {t('home:cta.agentButton')}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

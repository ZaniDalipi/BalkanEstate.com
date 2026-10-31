import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { SoftIcon } from '@/src/shared/illustrations';

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
            <SoftIcon name="home" className="w-12 h-12 mb-4" />
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
            <SoftIcon name="users" className="w-12 h-12 mb-4" />
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

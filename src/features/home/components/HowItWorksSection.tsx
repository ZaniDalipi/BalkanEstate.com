import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { SoftIcon } from '@/src/shared/illustrations';

interface HowItWorksSectionProps {
  onLearnMore: () => void;
}

const STEPS = [
  {
    number: '01',
    titleKey: 'step1Title',
    descKey: 'step1Desc',
    icon: 'search',
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
    iconBg: 'bg-blue-50',
    accentColor: '#3b82f6',
    participantKeys: ['buyer', 'renter', 'investor'],
  },
  {
    number: '02',
    titleKey: 'step2Title',
    descKey: 'step2Desc',
    icon: 'chat',
    gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    iconBg: 'bg-emerald-50',
    accentColor: '#10b981',
    participantKeys: ['agent', 'seller', 'negotiation'],
  },
  {
    number: '03',
    titleKey: 'step3Title',
    descKey: 'step3Desc',
    icon: 'key',
    gradient: 'bg-gradient-to-br from-violet-500 to-violet-600',
    iconBg: 'bg-violet-50',
    accentColor: '#8b5cf6',
    participantKeys: ['contract', 'keys', 'moveIn'],
  },
] as const;

const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onLearnMore }) => {
  const { t } = useTranslation(['home']);

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-gradient-to-b from-white via-slate-50/30 to-white overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
            {t('home:howItWorks.title', 'How It Works')}
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-3 max-w-lg mx-auto">
            {t('home:howItWorks.subtitle', 'Your journey from search to keys in three simple steps')}
          </p>
        </motion.div>

        {/* Step cards — staggered entrance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="relative group rounded-2xl bg-white border border-neutral-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 sm:p-7 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                {/* Top accent line */}
                <div className={`absolute top-0 left-6 right-6 h-[2px] rounded-full ${step.gradient}`} />

                {/* Step number */}
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-300">
                  {t('home:howItWorks.stepLabel', 'Step')} {step.number}
                </span>

                {/* Icon */}
                <SoftIcon name={step.icon} className="mt-4 w-12 h-12" />

                {/* Title */}
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {t(`home:howItWorks.${step.titleKey}`)}
                </h3>

                {/* Description */}
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  {t(`home:howItWorks.${step.descKey}`)}
                </p>

                {/* Participant pills */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {step.participantKeys.map((key) => (
                    <span
                      key={key}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
                      style={{
                        color: step.accentColor,
                        borderColor: `${step.accentColor}30`,
                        backgroundColor: `${step.accentColor}08`,
                      }}
                    >
                      {t(`home:howItWorks.participant_${key}`)}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 sm:mt-14 text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLearnMore}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-slate-700 border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 shadow-sm transition-all"
          >
            {t('home:howItWorks.learnMore', 'Learn More')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

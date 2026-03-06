import React from 'react';
import { useTranslation } from 'react-i18next';

interface HowItWorksSectionProps {
  onLearnMore: () => void;
}

const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onLearnMore }) => {
  const { t } = useTranslation(['home']);

  const steps = [
    {
      number: '01',
      titleKey: 'step1Title',
      descKey: 'step1Desc',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      ),
      color: 'bg-blue-600',
    },
    {
      number: '02',
      titleKey: 'step2Title',
      descKey: 'step2Desc',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.422-2.87-3.275-2.87-1.854 0-3.275 1.249-3.275 2.87v6.204c0 1.621 1.421 2.87 3.275 2.87 1.844 0 3.275-1.253 3.275-2.87V8.511Z" />
        </svg>
      ),
      color: 'bg-emerald-600',
    },
    {
      number: '03',
      titleKey: 'step3Title',
      descKey: 'step3Desc',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
        </svg>
      ),
      color: 'bg-violet-600',
    },
  ];

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {t('home:howItWorks.title')}
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
            {t('home:howItWorks.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="relative text-center sm:text-left">
              {/* Connector line (desktop only) */}
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute top-7 left-[calc(50%+28px)] right-[calc(-50%+28px)] h-[2px] bg-neutral-200" />
              )}

              <div className="flex flex-col items-center sm:items-start">
                <div className={`w-14 h-14 rounded-2xl ${step.color} text-white flex items-center justify-center relative z-10`}>
                  {step.icon}
                </div>
                <span className="text-xs font-bold text-slate-300 mt-3 uppercase tracking-wider">
                  {step.number}
                </span>
                <h3 className="text-base font-semibold text-slate-900 mt-1">
                  {t(`home:howItWorks.${step.titleKey}`)}
                </h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed max-w-xs">
                  {t(`home:howItWorks.${step.descKey}`)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={onLearnMore}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-700 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
          >
            {t('home:howItWorks.learnMore')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

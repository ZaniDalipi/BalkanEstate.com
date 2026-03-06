import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, MotionValue, useScroll, useTransform } from 'framer-motion';
import { CharacterV1, CharacterV2 } from '@/src/components/ui/text-scroll-animation';

interface HowItWorksSectionProps {
  onLearnMore: () => void;
}

/* ─── Step Card with scroll-driven entrance ─── */
interface StepCardProps {
  index: number;
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  scrollYProgress: MotionValue<number>;
  totalSteps: number;
}

const StepCard: React.FC<StepCardProps> = ({
  index,
  number,
  title,
  description,
  icon,
  gradient,
  iconBg,
  scrollYProgress,
  totalSteps,
}) => {
  const centerIndex = Math.floor(totalSteps / 2);

  return (
    <CharacterV2
      char=""
      index={index}
      centerIndex={centerIndex}
      scrollYProgress={scrollYProgress}
    >
      <div className="flex flex-col items-center text-center px-2">
        {/* Icon container */}
        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${iconBg} flex items-center justify-center shadow-sm`}>
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${gradient} flex items-center justify-center text-white`}>
            {icon}
          </div>
        </div>

        {/* Step number */}
        <span className="text-[11px] font-bold text-slate-300 mt-3 sm:mt-4 uppercase tracking-[0.2em]">
          {number}
        </span>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
          {title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 sm:mt-2 leading-relaxed max-w-[260px] sm:max-w-[280px]">
          {description}
        </p>
      </div>
    </CharacterV2>
  );
};

/* ─── Connector line with scroll-driven reveal ─── */
const ConnectorLine: React.FC<{ scrollYProgress: MotionValue<number> }> = ({
  scrollYProgress,
}) => {
  const scaleX = useTransform(scrollYProgress, [0.1, 0.5], [0, 1]);

  return (
    <div className="hidden sm:block absolute top-8 left-[calc(16.67%+32px)] right-[calc(16.67%+32px)] h-[2px]">
      <motion.div
        className="h-full bg-gradient-to-r from-blue-200 via-emerald-200 to-violet-200 rounded-full origin-left"
        style={{ scaleX }}
      />
    </div>
  );
};

const STEPS = [
  {
    number: '01',
    titleKey: 'step1Title',
    descKey: 'step1Desc',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-700',
    iconBg: 'bg-blue-50',
  },
  {
    number: '02',
    titleKey: 'step2Title',
    descKey: 'step2Desc',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
    gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    iconBg: 'bg-emerald-50',
  },
  {
    number: '03',
    titleKey: 'step3Title',
    descKey: 'step3Desc',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
    ),
    gradient: 'bg-gradient-to-br from-violet-500 to-violet-700',
    iconBg: 'bg-violet-50',
  },
] as const;

const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onLearnMore }) => {
  const { t } = useTranslation(['home']);
  const titleRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: titleScrollProgress } = useScroll({
    target: titleRef,
    offset: ['start end', 'end center'],
  });

  const { scrollYProgress: cardsScrollProgress } = useScroll({
    target: cardsRef,
    offset: ['start end', 'end center'],
  });

  const titleText = t('home:howItWorks.title', 'How It Works');
  const titleChars = titleText.split('');
  const titleCenterIndex = Math.floor(titleChars.length / 2);

  const subtitleOpacity = useTransform(titleScrollProgress, [0.3, 0.6], [0, 1]);
  const subtitleY = useTransform(titleScrollProgress, [0.3, 0.6], [15, 0]);

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-gradient-to-b from-white via-slate-50/50 to-white overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Title with scroll-driven character animation */}
        <div ref={titleRef} className="text-center mb-10 sm:mb-14 md:mb-16">
          <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            {titleChars.map((char, index) => (
              <CharacterV1
                key={index}
                char={char}
                index={index}
                centerIndex={titleCenterIndex}
                scrollYProgress={titleScrollProgress}
              />
            ))}
          </div>
          <motion.p
            className="text-xs sm:text-sm md:text-base text-slate-500 mt-2 sm:mt-3 max-w-md sm:max-w-lg mx-auto"
            style={{ opacity: subtitleOpacity, y: subtitleY }}
          >
            {t('home:howItWorks.subtitle')}
          </motion.p>
        </div>

        {/* Steps with scroll-driven scatter animation */}
        <div ref={cardsRef} className="relative">
          <ConnectorLine scrollYProgress={cardsScrollProgress} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 md:gap-8">
            {STEPS.map((step, i) => (
              <StepCard
                key={step.number}
                index={i}
                number={step.number}
                title={t(`home:howItWorks.${step.titleKey}`)}
                description={t(`home:howItWorks.${step.descKey}`)}
                icon={step.icon}
                gradient={step.gradient}
                iconBg={step.iconBg}
                scrollYProgress={cardsScrollProgress}
                totalSteps={STEPS.length}
              />
            ))}
          </div>
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
            className="inline-flex items-center gap-2 px-6 sm:px-7 py-2.5 sm:py-3 rounded-xl text-sm font-semibold text-slate-700 border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 shadow-sm transition-all"
          >
            {t('home:howItWorks.learnMore')}
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

import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, MotionValue, useScroll, useTransform } from 'framer-motion';
import { CharacterV1, CharacterV2 } from '@/src/components/ui/text-scroll-animation';

interface HowItWorksSectionProps {
  onLearnMore: () => void;
}

/* ─── Step card with glass styling ─── */
interface StepCardProps {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  accentColor: string;
  participants: string[];
}

const StepCard: React.FC<StepCardProps> = ({
  number,
  title,
  description,
  icon,
  gradient,
  accentColor,
  participants,
}) => (
  <div className="relative group w-[280px] sm:w-[300px]">
    {/* Glass card */}
    <div className="relative rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 sm:p-7 overflow-hidden transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
      {/* Top accent line */}
      <div
        className={`absolute top-0 left-6 right-6 h-[2px] rounded-full ${gradient}`}
      />

      {/* Glass refraction overlay */}
      <div className="absolute top-0 right-0 w-1/2 h-1/3 bg-gradient-to-bl from-white/40 to-transparent pointer-events-none rounded-tr-2xl" />

      {/* Step number */}
      <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-300">
        Step {number}
      </span>

      {/* Icon */}
      <div className={`mt-4 w-12 h-12 rounded-xl ${gradient} flex items-center justify-center text-white shadow-md`}>
        {icon}
      </div>

      {/* Title */}
      <h3 className="mt-4 text-lg font-bold text-slate-900 leading-tight">
        {title}
      </h3>

      {/* Description */}
      <p className="mt-2.5 text-sm text-slate-500 leading-relaxed">
        {description}
      </p>

      {/* Participants pills */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {participants.map((p) => (
          <span
            key={p}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
            style={{
              color: accentColor,
              borderColor: `${accentColor}30`,
              backgroundColor: `${accentColor}08`,
            }}
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Arrow connector between cards ─── */
const ArrowConnector: React.FC<{ scrollYProgress: MotionValue<number>; progressRange: [number, number] }> = ({
  scrollYProgress,
  progressRange,
}) => {
  const opacity = useTransform(scrollYProgress, progressRange, [0, 1]);
  const scaleX = useTransform(scrollYProgress, progressRange, [0, 1]);

  return (
    <motion.div
      className="hidden sm:flex items-center mx-2"
      style={{ opacity }}
    >
      <motion.div
        className="w-12 md:w-16 h-[2px] bg-gradient-to-r from-slate-200 to-slate-300 origin-left rounded-full"
        style={{ scaleX }}
      />
      <motion.div style={{ opacity }}>
        <svg className="w-3 h-3 text-slate-300 -ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z" />
        </svg>
      </motion.div>
    </motion.div>
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
    accentColor: '#3b82f6',
    participants: ['Buyer', 'Renter', 'Investor'],
  },
  {
    number: '02',
    titleKey: 'step2Title',
    descKey: 'step2Desc',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
    gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    accentColor: '#10b981',
    participants: ['Agent', 'Seller', 'Negotiation'],
  },
  {
    number: '03',
    titleKey: 'step3Title',
    descKey: 'step3Desc',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
      </svg>
    ),
    gradient: 'bg-gradient-to-br from-violet-500 to-violet-700',
    accentColor: '#8b5cf6',
    participants: ['Contract', 'Keys', 'Move In'],
  },
] as const;

const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onLearnMore }) => {
  const { t } = useTranslation(['home']);
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const titleText = t('home:howItWorks.title', 'How It Works');
  const titleChars = titleText.split('');
  const titleCenterIndex = Math.floor(titleChars.length / 2);

  const subtitleOpacity = useTransform(scrollYProgress, [0.12, 0.25], [0, 1]);
  const subtitleY = useTransform(scrollYProgress, [0.12, 0.25], [25, 0]);

  const ctaOpacity = useTransform(scrollYProgress, [0.4, 0.55], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.4, 0.55], [20, 0]);

  return (
    <div
      ref={sectionRef}
      className="relative h-[220vh]"
    >
      <section className="sticky top-0 h-screen flex items-center justify-center bg-gradient-to-b from-white via-slate-50/20 to-white overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-violet-100/30 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full">
          {/* Title with scatter animation */}
          <div className="text-center mb-10 sm:mb-14" style={{ perspective: '500px' }}>
            <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
              {titleChars.map((char, index) => (
                <CharacterV1
                  key={index}
                  char={char}
                  index={index}
                  centerIndex={titleCenterIndex}
                  scrollYProgress={scrollYProgress}
                />
              ))}
            </div>
            <motion.p
              className="text-sm sm:text-base text-slate-500 mt-3 max-w-lg mx-auto"
              style={{ opacity: subtitleOpacity, y: subtitleY }}
            >
              {t('home:howItWorks.subtitle', 'Your journey from search to keys in three simple steps')}
            </motion.p>
          </div>

          {/* Cards that scatter in using CharacterV2 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0">
            {STEPS.map((step, i) => (
              <React.Fragment key={step.number}>
                <CharacterV2
                  index={i}
                  centerIndex={Math.floor(STEPS.length / 2)}
                  scrollYProgress={scrollYProgress}
                  char=""
                >
                  <StepCard
                    number={step.number}
                    title={t(`home:howItWorks.${step.titleKey}`)}
                    description={t(`home:howItWorks.${step.descKey}`)}
                    icon={step.icon}
                    gradient={step.gradient}
                    accentColor={step.accentColor}
                    participants={step.participants}
                  />
                </CharacterV2>
                {i < STEPS.length - 1 && (
                  <ArrowConnector
                    scrollYProgress={scrollYProgress}
                    progressRange={[0.2 + i * 0.1, 0.35 + i * 0.1]}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* CTA Button */}
          <motion.div
            className="mt-10 sm:mt-14 text-center"
            style={{ opacity: ctaOpacity, y: ctaY }}
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
    </div>
  );
};

export default HowItWorksSection;

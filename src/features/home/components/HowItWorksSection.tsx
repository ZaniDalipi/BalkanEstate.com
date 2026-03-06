import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, MotionValue, useScroll, useTransform } from 'framer-motion';
import { CharacterV1 } from '@/src/components/ui/text-scroll-animation';

interface HowItWorksSectionProps {
  onLearnMore: () => void;
}

/* ─── Animated step card that scatters from the center ─── */
interface AnimatedStepProps {
  index: number;
  totalSteps: number;
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  scrollYProgress: MotionValue<number>;
}

const AnimatedStep: React.FC<AnimatedStepProps> = ({
  index,
  totalSteps,
  number,
  title,
  description,
  icon,
  gradient,
  iconBg,
  scrollYProgress,
}) => {
  const centerIndex = Math.floor(totalSteps / 2);
  const distanceFromCenter = index - centerIndex;

  const x = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 120, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], [Math.abs(distanceFromCenter) * 80, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.6, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
  const rotate = useTransform(scrollYProgress, [0, 0.5], [distanceFromCenter * 15, 0]);

  return (
    <motion.div
      className="flex flex-col items-center text-center px-4 will-change-transform"
      style={{ x, y, scale, opacity, rotate, transformOrigin: 'center' }}
    >
      {/* Icon container */}
      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${iconBg} flex items-center justify-center shadow-md`}>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${gradient} flex items-center justify-center text-white`}>
          {icon}
        </div>
      </div>

      {/* Step number */}
      <span className="text-[11px] font-bold text-slate-300 mt-4 sm:mt-5 uppercase tracking-[0.2em]">
        {number}
      </span>

      {/* Title */}
      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1.5">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-[280px]">
        {description}
      </p>
    </motion.div>
  );
};

/* ─── Connector line with scroll-driven reveal ─── */
const ConnectorLine: React.FC<{ scrollYProgress: MotionValue<number> }> = ({
  scrollYProgress,
}) => {
  const scaleX = useTransform(scrollYProgress, [0.2, 0.55], [0, 1]);
  const opacity = useTransform(scrollYProgress, [0.15, 0.35], [0, 1]);

  return (
    <div className="hidden sm:block absolute top-10 left-[calc(16.67%+40px)] right-[calc(16.67%+40px)] h-[2px]">
      <motion.div
        className="h-full bg-gradient-to-r from-blue-300 via-emerald-300 to-violet-300 rounded-full origin-left"
        style={{ scaleX, opacity }}
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
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
    ),
    gradient: 'bg-gradient-to-br from-violet-500 to-violet-700',
    iconBg: 'bg-violet-50',
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

  const subtitleOpacity = useTransform(scrollYProgress, [0.15, 0.3], [0, 1]);
  const subtitleY = useTransform(scrollYProgress, [0.15, 0.3], [30, 0]);

  const ctaOpacity = useTransform(scrollYProgress, [0.35, 0.5], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.35, 0.5], [20, 0]);

  return (
    <div
      ref={sectionRef}
      className="relative h-[200vh]"
    >
      <section className="sticky top-0 h-screen flex items-center justify-center bg-gradient-to-b from-white via-slate-50/30 to-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 w-full">
          {/* Title with scatter animation */}
          <div className="text-center mb-12 sm:mb-16" style={{ perspective: '500px' }}>
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
              className="text-sm sm:text-base text-slate-500 mt-3 sm:mt-4 max-w-lg mx-auto"
              style={{ opacity: subtitleOpacity, y: subtitleY }}
            >
              {t('home:howItWorks.subtitle', 'Your journey from search to keys in three simple steps')}
            </motion.p>
          </div>

          {/* Steps grid with scatter animation */}
          <div className="relative">
            <ConnectorLine scrollYProgress={scrollYProgress} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6 md:gap-8">
              {STEPS.map((step, i) => (
                <AnimatedStep
                  key={step.number}
                  index={i}
                  totalSteps={STEPS.length}
                  number={step.number}
                  title={t(`home:howItWorks.${step.titleKey}`)}
                  description={t(`home:howItWorks.${step.descKey}`)}
                  icon={step.icon}
                  gradient={step.gradient}
                  iconBg={step.iconBg}
                  scrollYProgress={scrollYProgress}
                />
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <motion.div
            className="mt-12 sm:mt-16 text-center"
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

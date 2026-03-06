import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
} from 'framer-motion';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  country: string;
  quote: string;
  avatar: string;
  rating: number;
  gradient: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 'testimonial-1',
    name: 'Elena P.',
    role: 'Home Buyer',
    country: 'Bulgaria',
    quote: 'Found our dream villa on the Black Sea coast in just two weeks. The AI search understood exactly what we wanted — even the sea view requirement!',
    avatar: 'EP',
    rating: 5,
    gradient: 'from-emerald-500 to-teal-400',
  },
  {
    id: 'testimonial-2',
    name: 'Marko N.',
    role: 'Real Estate Agent',
    country: 'Serbia',
    quote: 'BalkanEstate transformed my business. I went from 3 listings a month to over 15. The agency dashboard and analytics are game-changers.',
    avatar: 'MN',
    rating: 5,
    gradient: 'from-violet-500 to-purple-400',
  },
  {
    id: 'testimonial-3',
    name: 'Ana K.',
    role: 'Property Investor',
    country: 'Croatia',
    quote: 'The financial calculators and market analytics helped me identify undervalued properties in Split. My portfolio has grown 40% in a year.',
    avatar: 'AK',
    rating: 5,
    gradient: 'from-amber-500 to-orange-400',
  },
  {
    id: 'testimonial-4',
    name: 'Dritan H.',
    role: 'Agency Owner',
    country: 'Albania',
    quote: 'Managing 50+ agents across three offices was chaos before BalkanEstate. Now everything — listings, leads, commissions — is in one place.',
    avatar: 'DH',
    rating: 5,
    gradient: 'from-rose-500 to-pink-400',
  },
  {
    id: 'testimonial-5',
    name: 'Ioanna P.',
    role: 'Expat Buyer',
    country: 'Greece',
    quote: 'As a foreigner buying in Athens, the multilingual support and verified agents made the process feel safe. The 3D map feature is incredible.',
    avatar: 'IP',
    rating: 4.5,
    gradient: 'from-sky-500 to-cyan-400',
  },
  {
    id: 'testimonial-6',
    name: 'Stefan J.',
    role: 'Property Seller',
    country: 'Montenegro',
    quote: 'Listed my apartment in Budva and received 12 inquiries in the first week. The Premium promotion tier was absolutely worth it.',
    avatar: 'SJ',
    rating: 5,
    gradient: 'from-indigo-500 to-violet-400',
  },
];

const StarIcon: React.FC<{ filled: boolean; half?: boolean }> = ({ filled, half }) => {
  if (half) {
    return (
      <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
        <defs>
          <linearGradient id="halfStar">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="rgb(209 213 219)" />
          </linearGradient>
        </defs>
        <path
          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"
          fill="url(#halfStar)"
        />
      </svg>
    );
  }
  return (
    <svg className={`w-5 h-5 ${filled ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
    </svg>
  );
};

const Stars: React.FC<{ rating: number }> = ({ rating }) => {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} filled={i < full} half={i === full && hasHalf} />
      ))}
    </div>
  );
};

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation('home');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Map scroll progress to active testimonial index
  const cardProgress = useTransform(
    scrollYProgress,
    [0, 1],
    [0, TESTIMONIALS.length - 1]
  );

  useMotionValueEvent(cardProgress, 'change', (latest) => {
    const index = Math.round(latest);
    setActiveIndex(Math.min(Math.max(index, 0), TESTIMONIALS.length - 1));
  });

  return (
    <section
      ref={containerRef}
      className="relative bg-white"
      style={{ height: `${(TESTIMONIALS.length + 1) * 100}vh` }}
    >
      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 mb-4"
          >
            {t('testimonials.badge', 'Testimonials')}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900"
          >
            {t('testimonials.title', 'What Our Users Say')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-2 max-w-lg mx-auto text-sm text-slate-500"
          >
            {t('testimonials.subtitle', 'Trusted by thousands of buyers, sellers, and agents across the Balkans')}
          </motion.p>
        </div>

        {/* Card stack */}
        <div className="relative w-full max-w-md h-[320px]">
          {TESTIMONIALS.map((testimonial, index) => {
            const isActive = index === activeIndex;
            const isPast = index < activeIndex;
            const isFuture = index > activeIndex;
            const offset = index - activeIndex;

            return (
              <motion.div
                key={testimonial.id}
                className="absolute inset-0 w-full"
                animate={{
                  y: isFuture ? 12 * Math.min(offset, 3) : isPast ? -40 : 0,
                  scale: isFuture ? 1 - 0.04 * Math.min(offset, 3) : isPast ? 0.95 : 1,
                  opacity: isActive ? 1 : isFuture && offset <= 3 ? 0.6 - offset * 0.15 : 0,
                  rotateX: isPast ? -10 : 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
                style={{
                  zIndex: TESTIMONIALS.length - Math.abs(offset),
                  perspective: '1000px',
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
              >
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 flex flex-col gap-5 h-full">
                  {/* Stars */}
                  <Stars rating={testimonial.rating} />

                  {/* Quote */}
                  <blockquote className="text-lg text-slate-700 leading-relaxed flex-1">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <div
                      className={`w-11 h-11 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center flex-shrink-0`}
                    >
                      <span className="text-white text-sm font-bold">
                        {testimonial.avatar}
                      </span>
                    </div>
                    <div>
                      <span className="block text-sm font-semibold text-slate-900">
                        {testimonial.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {testimonial.role} · {testimonial.country}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-6">
          {TESTIMONIALS.map((_, index) => (
            <motion.div
              key={index}
              className="rounded-full"
              animate={{
                width: index === activeIndex ? 24 : 8,
                height: 8,
                backgroundColor: index === activeIndex ? '#0f172a' : '#cbd5e1',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          ))}
        </div>

        {/* Counter */}
        <p className="mt-3 text-xs text-slate-400">
          {activeIndex + 1} / {TESTIMONIALS.length}
        </p>
      </div>
    </section>
  );
};

export default TestimonialsSection;

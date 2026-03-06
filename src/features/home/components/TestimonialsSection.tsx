import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useTransform } from 'framer-motion';

interface Testimonial {
  name: string;
  role: string;
  country: string;
  quote: string;
  avatar: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Elena Petrova',
    role: 'Home Buyer',
    country: 'Bulgaria',
    quote: 'Found our dream villa on the Black Sea coast in just two weeks. The AI search understood exactly what we wanted — even the sea view requirement!',
    avatar: 'EP',
    rating: 5,
  },
  {
    name: 'Marko Nikolić',
    role: 'Real Estate Agent',
    country: 'Serbia',
    quote: 'BalkanEstate transformed my business. I went from 3 listings a month to over 15. The agency dashboard and analytics are game-changers.',
    avatar: 'MN',
    rating: 5,
  },
  {
    name: 'Ana Kovačević',
    role: 'Property Investor',
    country: 'Croatia',
    quote: 'The financial calculators and market analytics helped me identify undervalued properties in Split. My portfolio has grown 40% in a year.',
    avatar: 'AK',
    rating: 5,
  },
  {
    name: 'Dritan Hoxha',
    role: 'Agency Owner',
    country: 'Albania',
    quote: 'Managing 50+ agents across three offices was chaos before BalkanEstate. Now everything — listings, leads, commissions — is in one place.',
    avatar: 'DH',
    rating: 5,
  },
  {
    name: 'Ioanna Papadopoulos',
    role: 'Expat Buyer',
    country: 'Greece',
    quote: 'As a foreigner buying in Athens, the multilingual support and verified agents made the process feel safe. The 3D map feature is incredible.',
    avatar: 'IP',
    rating: 5,
  },
  {
    name: 'Stefan Jovanović',
    role: 'Property Seller',
    country: 'Montenegro',
    quote: 'Listed my apartment in Budva and received 12 inquiries in the first week. The Premium promotion tier was absolutely worth it.',
    avatar: 'SJ',
    rating: 5,
  },
];

const GRADIENT_BORDERS = [
  'from-blue-500 to-cyan-400',
  'from-emerald-500 to-teal-400',
  'from-violet-500 to-purple-400',
  'from-amber-500 to-orange-400',
  'from-rose-500 to-pink-400',
  'from-indigo-500 to-blue-400',
];

const TestimonialCard: React.FC<{
  testimonial: Testimonial;
  index: number;
  progress: any;
  total: number;
}> = ({ testimonial, index, progress, total }) => {
  // Each card has its own scroll range — stacks and unstacks
  const cardStart = index / total;
  const cardEnd = (index + 1) / total;

  const scale = useTransform(progress, [cardStart, cardEnd], [1, 0.92]);
  const y = useTransform(progress, [cardStart, cardEnd], [0, -30]);
  const opacity = useTransform(progress, [cardStart, Math.min(cardEnd + 0.1, 1)], [1, index === total - 1 ? 1 : 0.6]);
  const rotateX = useTransform(progress, [cardStart, cardEnd], [0, -3]);

  return (
    <motion.div
      style={{
        scale,
        y,
        opacity,
        rotateX,
        zIndex: total - index,
        position: 'sticky',
        top: `${120 + index * 20}px`,
      }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="relative">
        {/* Gradient border effect */}
        <div className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-br ${GRADIENT_BORDERS[index % GRADIENT_BORDERS.length]} opacity-20`} />
        <div className="relative bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-neutral-100/80">
          {/* Stars */}
          <div className="flex gap-0.5 mb-4">
            {Array.from({ length: testimonial.rating }).map((_, i) => (
              <svg key={i} className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>

          {/* Quote */}
          <p className="text-sm md:text-base text-slate-700 leading-relaxed mb-6">
            &ldquo;{testimonial.quote}&rdquo;
          </p>

          {/* Author */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${GRADIENT_BORDERS[index % GRADIENT_BORDERS.length]} flex items-center justify-center`}>
              <span className="text-white text-xs font-bold">{testimonial.avatar}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{testimonial.name}</p>
              <p className="text-xs text-slate-500">{testimonial.role} &middot; {testimonial.country}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation('home');
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section
      ref={containerRef}
      className="relative bg-gradient-to-b from-neutral-50 to-white"
      style={{ minHeight: `${100 + TESTIMONIALS.length * 30}vh` }}
    >
      {/* Header — sticky at top */}
      <div className="sticky top-0 z-0 pt-16 md:pt-24 pb-8 text-center bg-gradient-to-b from-neutral-50 via-neutral-50 to-transparent">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 mb-4"
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
          className="mt-3 text-sm sm:text-base text-slate-500 max-w-2xl mx-auto"
        >
          {t('testimonials.subtitle', 'Trusted by thousands of buyers, sellers, and agents across the Balkans')}
        </motion.p>
      </div>

      {/* Cards stack */}
      <div className="relative px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex flex-col gap-6">
          {TESTIMONIALS.map((testimonial, i) => (
            <TestimonialCard
              key={testimonial.name}
              testimonial={testimonial}
              index={i}
              progress={scrollYProgress}
              total={TESTIMONIALS.length}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

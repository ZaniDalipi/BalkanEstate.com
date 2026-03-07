import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ContainerScroll,
  CardsContainer,
  CardTransformed,
  ReviewStars,
} from '@/src/components/blocks/animated-cards-stack';
import { useTestimonials, Testimonial } from '../hooks/useTestimonials';

/* ─── Single testimonial card (dark glass style) ─── */
const TestimonialCard: React.FC<{
  testimonial: Testimonial;
  index: number;
  total: number;
}> = ({ testimonial, index, total }) => {
  const initials = testimonial.name
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <CardTransformed
      key={testimonial.id}
      index={index}
      arrayLength={total}
      variant="dark"
      incrementY={12}
      incrementZ={8}
      incrementRotation={3}
    >
      <ReviewStars rating={testimonial.rating} className="text-emerald-400" />

      <blockquote className="text-center text-base sm:text-lg leading-relaxed text-stone-300 max-w-xs">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>

      <div className="flex items-center gap-3">
        {testimonial.avatarUrl ? (
          <img
            src={testimonial.avatarUrl}
            alt={testimonial.name}
            className="w-11 h-11 rounded-full object-cover border-2 border-stone-600/50 shadow-md"
            loading="lazy"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-stone-700/60 border-2 border-stone-600/50 shadow-md flex items-center justify-center text-sm font-bold text-stone-300">
            {initials}
          </div>
        )}
        <div>
          <span className="block text-sm font-bold text-stone-100">
            {testimonial.name}
          </span>
          <span className="block text-xs text-stone-400">
            {testimonial.profession}
            {testimonial.country ? ` · ${testimonial.country}` : ''}
          </span>
        </div>
        {testimonial.source === 'google' && (
          <span className="ml-auto text-[10px] font-medium text-stone-500 bg-stone-800/60 px-2 py-0.5 rounded-full border border-stone-700/50">
            Google
          </span>
        )}
      </div>
    </CardTransformed>
  );
};

/* ─── Loading skeleton ─── */
const TestimonialsSkeleton: React.FC = () => (
  <div className="flex justify-center">
    <div className="w-[350px] h-[300px] rounded-2xl bg-stone-800/50 animate-pulse" />
  </div>
);

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation('home');
  const { testimonials, isLoading } = useTestimonials();

  if (isLoading) {
    return (
      <section className="py-16 sm:py-20 bg-stone-950">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="h-8 w-64 bg-stone-800 rounded mx-auto animate-pulse" />
            <div className="h-4 w-96 bg-stone-800 rounded mx-auto mt-3 animate-pulse" />
          </div>
          <TestimonialsSkeleton />
        </div>
      </section>
    );
  }

  if (!testimonials.length) return null;

  return (
    <section className="bg-stone-950">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center pt-16 sm:pt-20"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-100">
            {t('testimonials.title', 'Testimonials')}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-stone-400">
            {t(
              'testimonials.subtitle',
              'Trusted by thousands of buyers, sellers, and agents across the Balkans'
            )}
          </p>
        </motion.div>
      </div>

      {/* Scroll-driven card stack — each scroll reveals the next testimonial */}
      <ContainerScroll
        className="min-h-[200vh]"
        style={{ minHeight: `${Math.max(testimonials.length * 50, 250)}vh` }}
      >
        <div className="sticky top-[10vh] flex items-start justify-center pt-24">
          <CardsContainer className="h-[380px] w-[350px] sm:h-[420px] sm:w-[400px]">
            {testimonials.map((testimonial, i) => (
              <TestimonialCard
                key={testimonial.id}
                testimonial={testimonial}
                index={i}
                total={testimonials.length}
              />
            ))}
          </CardsContainer>
        </div>
      </ContainerScroll>
    </section>
  );
};

export default TestimonialsSection;

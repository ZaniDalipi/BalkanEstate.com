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

/* ─── Single testimonial card ─── */
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
      variant="light"
      incrementY={14}
      incrementZ={10}
      incrementRotation={0}
    >
      <ReviewStars rating={testimonial.rating} className="text-amber-500" />

      <blockquote className="text-center text-lg leading-relaxed text-slate-700 max-w-sm">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>

      <div className="flex items-center gap-3 mt-2">
        {testimonial.avatarUrl ? (
          <img
            src={testimonial.avatarUrl}
            alt={testimonial.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-neutral-100 shadow-sm"
            loading="lazy"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-neutral-100 shadow-sm flex items-center justify-center text-sm font-bold text-slate-600">
            {initials}
          </div>
        )}
        <div>
          <span className="block text-sm font-bold text-slate-900">
            {testimonial.name}
          </span>
          <span className="block text-xs text-slate-500">
            {testimonial.profession}
            {testimonial.country ? ` · ${testimonial.country}` : ''}
          </span>
        </div>
        {testimonial.source === 'google' && (
          <span className="ml-auto text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
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
    <div className="w-[350px] h-[300px] rounded-2xl bg-neutral-100 animate-pulse" />
  </div>
);

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation('home');
  const { testimonials, isLoading } = useTestimonials();

  if (isLoading) {
    return (
      <section className="py-16 sm:py-20 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="h-8 w-64 bg-neutral-100 rounded mx-auto animate-pulse" />
            <div className="h-4 w-96 bg-neutral-100 rounded mx-auto mt-3 animate-pulse" />
          </div>
          <TestimonialsSkeleton />
        </div>
      </section>
    );
  }

  if (!testimonials.length) return null;

  return (
    <section className="bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center pt-16 sm:pt-20"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
            {t('testimonials.title', 'What Our Users Say')}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
            {t(
              'testimonials.subtitle',
              'Trusted by thousands of buyers, sellers, and agents across the Balkans'
            )}
          </p>
        </motion.div>
      </div>

      {/* Scroll-driven card stack — each scroll reveals the next testimonial */}
      <ContainerScroll
        className="min-h-[250vh]"
        style={{ minHeight: `${Math.max(testimonials.length * 60, 300)}vh` }}
      >
        <div className="sticky top-[8vh] flex items-start justify-center pt-20">
          <CardsContainer className="h-[420px] w-[420px] sm:h-[460px] sm:w-[480px]">
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

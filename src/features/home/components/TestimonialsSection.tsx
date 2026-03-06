import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  CardTransformed,
  CardsContainer,
  ContainerScroll,
  ReviewStars,
} from '@/src/components/blocks/animated-cards-stack';

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

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation('home');

  return (
    <section className="bg-white px-4 sm:px-8 py-12">
      {/* Header */}
      <div className="text-center">
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

      {/* Animated cards stack */}
      <ContainerScroll className="h-[300vh]">
        <div className="sticky left-0 top-0 h-svh w-full py-12">
          <CardsContainer className="mx-auto size-full h-[450px] w-[350px]">
            {TESTIMONIALS.map((testimonial, index) => (
              <CardTransformed
                key={testimonial.id}
                arrayLength={TESTIMONIALS.length}
                variant="light"
                index={index + 2}
                role="article"
                aria-labelledby={`card-${testimonial.id}-title`}
                aria-describedby={`card-${testimonial.id}-content`}
              >
                <div className="flex flex-col items-center space-y-4 text-center">
                  <ReviewStars
                    className="text-teal-500"
                    rating={testimonial.rating}
                  />
                  <div className="mx-auto w-4/5 text-lg text-slate-700">
                    <blockquote>&ldquo;{testimonial.quote}&rdquo;</blockquote>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-sm font-bold">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <span className="block text-lg font-semibold tracking-tight text-slate-900">
                      {testimonial.name}
                    </span>
                    <span className="block text-sm text-slate-500">
                      {testimonial.role} &middot; {testimonial.country}
                    </span>
                  </div>
                </div>
              </CardTransformed>
            ))}
          </CardsContainer>
        </div>
      </ContainerScroll>
    </section>
  );
};

export default TestimonialsSection;

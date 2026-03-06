import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AnimatedCardsStack, CardItem } from '@/src/components/ui/animated-cards-stack';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/src/components/ui/avatar';

const TESTIMONIALS = [
  {
    id: 'testimonial-1',
    name: 'Elena P.',
    profession: 'Home Buyer',
    country: 'Bulgaria',
    rating: 5,
    description:
      'Found our dream villa on the Black Sea coast in just two weeks. The AI search understood exactly what we wanted — even the sea view requirement!',
    avatarUrl:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'testimonial-2',
    name: 'Marko N.',
    profession: 'Real Estate Agent',
    country: 'Serbia',
    rating: 5,
    description:
      'BalkanEstate transformed my business. I went from 3 listings a month to over 15. The agency dashboard and analytics are game-changers.',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop',
  },
  {
    id: 'testimonial-3',
    name: 'Ana K.',
    profession: 'Property Investor',
    country: 'Croatia',
    rating: 5,
    description:
      'The financial calculators and market analytics helped me identify undervalued properties in Split. My portfolio has grown 40% in a year.',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'testimonial-4',
    name: 'Dritan H.',
    profession: 'Agency Owner',
    country: 'Albania',
    rating: 5,
    description:
      'Managing 50+ agents across three offices was chaos before BalkanEstate. Now everything — listings, leads, commissions — is in one place.',
    avatarUrl:
      'https://plus.unsplash.com/premium_photo-1690407617542-2f210cf20d7e?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'testimonial-5',
    name: 'Ioanna P.',
    profession: 'Expat Buyer',
    country: 'Greece',
    rating: 4.5,
    description:
      'As a foreigner buying in Athens, the multilingual support and verified agents made the process feel safe. The 3D map feature is incredible.',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: 'testimonial-6',
    name: 'Stefan J.',
    profession: 'Property Seller',
    country: 'Montenegro',
    rating: 5,
    description:
      'Listed my apartment in Budva and received 12 inquiries in the first week. The Premium promotion tier was absolutely worth it.',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=60',
  },
];

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const filled = Math.floor(rating);
  const hasFraction = rating - filled > 0;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: filled }).map((_, i) => (
        <svg key={i} className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
      {hasFraction && (
        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half-star">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="rgb(209 213 219)" />
            </linearGradient>
          </defs>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" fill="url(#half-star)" />
        </svg>
      )}
    </div>
  );
};

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation('home');

  const cardItems: CardItem[] = TESTIMONIALS.map((testimonial) => ({
    id: testimonial.id,
    content: (
      <div className="flex flex-col items-center justify-between h-full bg-white rounded-2xl p-6 border border-neutral-100">
        <div className="flex flex-col items-center space-y-4 text-center flex-1">
          <StarRating rating={testimonial.rating} />
          <blockquote className="text-base leading-relaxed text-slate-700 max-w-[280px]">
            &ldquo;{testimonial.description}&rdquo;
          </blockquote>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <Avatar className="!size-11 border border-neutral-200">
            <AvatarImage
              src={testimonial.avatarUrl}
              alt={`Portrait of ${testimonial.name}`}
            />
            <AvatarFallback>
              {testimonial.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="block text-sm font-semibold text-slate-900">
              {testimonial.name}
            </span>
            <span className="block text-xs text-slate-500">
              {testimonial.profession} · {testimonial.country}
            </span>
          </div>
        </div>
      </div>
    ),
  }));

  return (
    <section className="py-16 sm:py-20 bg-neutral-50 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900"
        >
          {t('testimonials.title', 'What Our Users Say')}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-2 max-w-lg text-center text-sm text-slate-500 mb-12"
        >
          {t(
            'testimonials.subtitle',
            'Trusted by thousands of buyers, sellers, and agents across the Balkans'
          )}
        </motion.p>

        <div className="flex justify-center">
          <AnimatedCardsStack
            items={cardItems}
            width={350}
            height={380}
            autoPlayInterval={4000}
            stackOffset={10}
            scaleStep={0.05}
            maxVisibleCards={3}
          />
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

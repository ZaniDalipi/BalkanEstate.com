import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  CardTransformed,
  CardsContainer,
  ContainerScroll,
  ReviewStars,
} from '@/src/components/blocks/animated-cards-stack';
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

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation('home');

  return (
    <section className="bg-white px-4 sm:px-8 py-12">
      <div>
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
          className="mx-auto mt-2 max-w-lg text-center text-sm text-slate-500"
        >
          {t(
            'testimonials.subtitle',
            'Trusted by thousands of buyers, sellers, and agents across the Balkans'
          )}
        </motion.p>
      </div>
      <ContainerScroll className="container h-[300vh]">
        <div className="sticky left-0 top-0 h-svh w-full py-12">
          <CardsContainer className="mx-auto size-full h-[450px] w-[350px]">
            {TESTIMONIALS.map((testimonial, index) => (
              <CardTransformed
                arrayLength={TESTIMONIALS.length}
                key={testimonial.id}
                variant="light"
                index={index + 2}
                role="article"
                aria-labelledby={`card-${testimonial.id}-title`}
                aria-describedby={`card-${testimonial.id}-content`}
              >
                <div className="flex flex-col items-center space-y-4 text-center">
                  <ReviewStars
                    className="text-amber-500"
                    rating={testimonial.rating}
                  />
                  <div className="mx-auto w-4/5 text-lg" id={`card-${testimonial.id}-content`}>
                    <blockquote>&ldquo;{testimonial.description}&rdquo;</blockquote>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Avatar className="!size-12 border border-stone-300">
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
                    <span
                      className="block text-lg font-semibold tracking-tight md:text-xl"
                      id={`card-${testimonial.id}-title`}
                    >
                      {testimonial.name}
                    </span>
                    <span className="block text-sm text-slate-500">
                      {testimonial.profession} · {testimonial.country}
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

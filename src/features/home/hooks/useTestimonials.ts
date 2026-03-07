import { useQuery } from '@tanstack/react-query';
import { API_CONFIG } from '@/src/shared/constants/app.constants';

export interface Testimonial {
  id: string;
  name: string;
  avatarUrl?: string;
  profession: string;
  country: string;
  rating: number;
  quote: string;
  source: 'platform' | 'google';
  createdAt: string;
}

interface ApiTestimonial {
  _id: string;
  name: string;
  avatarUrl?: string;
  profession?: string;
  country?: string;
  rating: number;
  quote: string;
  source: 'platform' | 'google';
  createdAt: string;
}

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    id: 'demo-1',
    name: 'Elena Kovačević',
    profession: 'Real Estate Investor',
    country: 'Croatia',
    rating: 5,
    quote: 'BalkanEstate made finding my dream apartment in Split incredibly easy. The platform is intuitive and the listings are always up to date. Closed the deal in just two weeks!',
    source: 'google',
    createdAt: '2026-02-15',
  },
  {
    id: 'demo-2',
    name: 'Dritan Hoxha',
    profession: 'Business Owner',
    country: 'Albania',
    rating: 5,
    quote: 'I purchased a commercial property in Tirana through BalkanEstate. The agent network is excellent and the whole process was transparent from start to finish.',
    source: 'platform',
    createdAt: '2026-02-10',
  },
  {
    id: 'demo-3',
    name: 'Milena Petrović',
    profession: 'Software Engineer',
    country: 'Serbia',
    rating: 5,
    quote: 'As a first-time buyer, I was nervous about the process. BalkanEstate connected me with a fantastic agent in Belgrade who walked me through every step. Highly recommend!',
    source: 'google',
    createdAt: '2026-01-28',
  },
  {
    id: 'demo-4',
    name: 'Alexandros Papadopoulos',
    profession: 'Retired Professor',
    country: 'Greece',
    rating: 4,
    quote: 'Found a beautiful seaside villa in Thessaloniki at a great price. The filters and map view helped me narrow down exactly what I was looking for. Great experience overall.',
    source: 'platform',
    createdAt: '2026-01-20',
  },
  {
    id: 'demo-5',
    name: 'Ana Jovanović',
    profession: 'Interior Designer',
    country: 'Montenegro',
    rating: 5,
    quote: 'The property photos and virtual tours on BalkanEstate are top-notch. I relocated from Germany to Budva and found the perfect home without even visiting in person first.',
    source: 'google',
    createdAt: '2026-01-15',
  },
  {
    id: 'demo-6',
    name: 'Stefan Dimitrov',
    profession: 'Financial Analyst',
    country: 'Bulgaria',
    rating: 5,
    quote: 'I\'ve been using BalkanEstate for investment properties across the region. The market insights and pricing data are invaluable. Already closed three deals this year.',
    source: 'platform',
    createdAt: '2026-01-08',
  },
];

async function fetchTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/testimonials?limit=10`);
    if (!res.ok) return FALLBACK_TESTIMONIALS;

    const data = await res.json();
    const testimonials: ApiTestimonial[] = data.testimonials || [];

    if (testimonials.length === 0) return FALLBACK_TESTIMONIALS;

    return testimonials.map(t => ({
      id: t._id,
      name: t.name,
      avatarUrl: t.avatarUrl,
      profession: t.profession || 'User',
      country: t.country || '',
      rating: Math.min(Math.max(t.rating, 1), 5),
      quote: t.quote,
      source: t.source,
      createdAt: t.createdAt,
    }));
  } catch {
    return FALLBACK_TESTIMONIALS;
  }
}

export function useTestimonials() {
  const { data = [], isPending, error } = useQuery<Testimonial[]>({
    queryKey: ['testimonials'],
    queryFn: fetchTestimonials,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  return {
    testimonials: data,
    isLoading: isPending,
    error: error as Error | null,
  };
}

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

async function fetchTestimonials(): Promise<Testimonial[]> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/testimonials?limit=10`);
  if (!res.ok) return [];

  const data = await res.json();
  const testimonials: ApiTestimonial[] = data.testimonials || [];

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

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

interface AgentTestimonialResponse {
  clientName: string;
  userId?: {
    _id: string;
    name: string;
    avatar?: string;
  };
  quote: string;
  rating: number;
  createdAt: string;
}

interface AgentResponse {
  _id: string;
  userId?: { name?: string; avatar?: string; country?: string };
  testimonials?: AgentTestimonialResponse[];
  specialties?: string[];
}

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    id: 'fallback-1',
    name: 'Elena P.',
    profession: 'Home Buyer',
    country: 'Bulgaria',
    rating: 5,
    quote: 'Found our dream villa on the Black Sea coast in just two weeks. The AI search understood exactly what we wanted — even the sea view requirement!',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=60',
    source: 'platform',
    createdAt: '2026-01-15',
  },
  {
    id: 'fallback-2',
    name: 'Marko N.',
    profession: 'Real Estate Agent',
    country: 'Serbia',
    rating: 5,
    quote: 'BalkanEstate transformed my business. I went from 3 listings a month to over 15. The agency dashboard and analytics are game-changers.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=60',
    source: 'platform',
    createdAt: '2026-01-20',
  },
  {
    id: 'fallback-3',
    name: 'Ana K.',
    profession: 'Property Investor',
    country: 'Croatia',
    rating: 5,
    quote: 'The financial calculators and market analytics helped me identify undervalued properties in Split. My portfolio has grown 40% in a year.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60',
    source: 'platform',
    createdAt: '2026-02-01',
  },
  {
    id: 'fallback-4',
    name: 'Dritan H.',
    profession: 'Agency Owner',
    country: 'Albania',
    rating: 5,
    quote: 'Managing 50+ agents across three offices was chaos before BalkanEstate. Now everything — listings, leads, commissions — is in one place.',
    avatarUrl: 'https://plus.unsplash.com/premium_photo-1690407617542-2f210cf20d7e?w=200&auto=format&fit=crop&q=60',
    source: 'platform',
    createdAt: '2026-02-10',
  },
  {
    id: 'fallback-5',
    name: 'Ioanna P.',
    profession: 'Expat Buyer',
    country: 'Greece',
    rating: 4.5,
    quote: 'As a foreigner buying in Athens, the multilingual support and verified agents made the process feel safe. The 3D map feature is incredible.',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=60',
    source: 'platform',
    createdAt: '2026-02-15',
  },
  {
    id: 'fallback-6',
    name: 'Stefan J.',
    profession: 'Property Seller',
    country: 'Montenegro',
    rating: 5,
    quote: 'Listed my apartment in Budva and received 12 inquiries in the first week. The Premium promotion tier was absolutely worth it.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=60',
    source: 'platform',
    createdAt: '2026-02-20',
  },
];

function transformAgentTestimonials(agents: AgentResponse[]): Testimonial[] {
  const testimonials: Testimonial[] = [];

  for (const agent of agents) {
    if (!agent.testimonials?.length) continue;

    for (const t of agent.testimonials) {
      const name = t.userId?.name || t.clientName || 'Anonymous';
      testimonials.push({
        id: `${agent._id}-${t.createdAt}`,
        name,
        avatarUrl: t.userId?.avatar,
        profession: agent.specialties?.[0] || 'User',
        country: agent.userId?.country || '',
        rating: Math.min(Math.max(t.rating, 1), 5),
        quote: t.quote,
        source: 'platform',
        createdAt: t.createdAt,
      });
    }
  }

  return testimonials
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
}

async function fetchTestimonials(): Promise<Testimonial[]> {
  const res = await fetch(
    `${API_CONFIG.BASE_URL}/agents?sortBy=rating&limit=20&minRating=4`
  );

  if (!res.ok) return [];

  const data = await res.json();
  const agents: AgentResponse[] = data.agents || [];
  return transformAgentTestimonials(agents);
}

export function useTestimonials() {
  const { data, isPending, error } = useQuery<Testimonial[]>({
    queryKey: ['testimonials'],
    queryFn: fetchTestimonials,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    placeholderData: FALLBACK_TESTIMONIALS,
  });

  // Use fetched data if available, otherwise fall back to static testimonials
  const testimonials = data && data.length >= 3 ? data : FALLBACK_TESTIMONIALS;

  return {
    testimonials,
    isLoading: isPending && !testimonials.length,
    error: error as Error | null,
  };
}

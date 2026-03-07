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

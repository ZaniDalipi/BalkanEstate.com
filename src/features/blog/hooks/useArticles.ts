import { useQuery } from '@tanstack/react-query';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import { ArticlesResponse, ArticleFilters } from '../types/article.types';

export const useArticles = (filters: ArticleFilters = {}) => {
  const { category, country, tag, page = 1, limit = 12, search } = filters;

  const queryParams = new URLSearchParams();
  if (category) queryParams.append('category', category);
  if (country) queryParams.append('country', country);
  if (tag) queryParams.append('tag', tag);
  queryParams.append('page', String(Math.max(1, page)));
  queryParams.append('limit', String(Math.min(50, Math.max(1, limit))));
  if (search?.trim()) queryParams.append('search', search.trim());

  const { data, isLoading, error } = useQuery<ArticlesResponse, Error>({
    queryKey: ['articles', { category, country, tag, page, limit, search }],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/articles?${queryParams.toString()}`,
        { signal },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message || `Failed to fetch articles (${response.status})`);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, err) => {
      // Don't retry client errors (4xx) — only transient network/5xx failures
      if (err.message.includes('(4')) return false;
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });

  return {
    articles: data?.articles ?? [],
    pagination: data?.pagination,
    isLoading,
    error: error ?? null,
  };
};

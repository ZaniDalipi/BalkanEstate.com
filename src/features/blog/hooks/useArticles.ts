import { useQuery } from '@tanstack/react-query';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import { ArticlesResponse, ArticleFilters } from '../types/article.types';

export const useArticles = (filters: ArticleFilters = {}) => {
  const { category, country, tag, page = 1, limit = 12, search } = filters;

  const queryParams = new URLSearchParams();
  if (category) queryParams.append('category', category);
  if (country) queryParams.append('country', country);
  if (tag) queryParams.append('tag', tag);
  queryParams.append('page', String(page));
  queryParams.append('limit', String(limit));
  if (search) queryParams.append('search', search);

  const { data, isLoading, error } = useQuery<ArticlesResponse>({
    queryKey: ['articles', { category, country, tag, page, limit, search }],
    queryFn: async () => {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/articles?${queryParams.toString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch articles');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    articles: data?.articles || [],
    pagination: data?.pagination,
    isLoading,
    error,
  };
};

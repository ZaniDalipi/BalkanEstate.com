import { useQuery } from '@tanstack/react-query';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import { ArticleDetail } from '../types/article.types';

export const useArticle = (slug: string | null) => {
  const { data, isLoading, error } = useQuery<{ article: ArticleDetail }, Error>({
    queryKey: ['article', slug],
    queryFn: async ({ signal }) => {
      if (!slug) throw new Error('Slug is required');
      const response = await fetch(`${API_CONFIG.BASE_URL}/articles/${slug}`, { signal });
      if (response.status === 404) throw new Error('Article not found');
      if (!response.ok) throw new Error(`Failed to fetch article (${response.status})`);
      return response.json();
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: (failureCount, err) => {
      // Never retry 404 — the article doesn't exist
      if (err.message.includes('not found') || err.message.includes('(404')) return false;
      return failureCount < 1;
    },
    refetchOnWindowFocus: false,
  });

  return {
    article: data?.article ?? null,
    isLoading,
    error: error ?? null,
  };
};

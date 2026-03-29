import { useQuery } from '@tanstack/react-query';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import { ArticleDetail } from '../types/article.types';

export const useArticle = (slug: string | null) => {
  const { data, isLoading, error } = useQuery<{ article: ArticleDetail }>({
    queryKey: ['article', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug is required');
      const response = await fetch(`${API_CONFIG.BASE_URL}/articles/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch article');
      return response.json();
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    article: data?.article || null,
    isLoading,
    error,
  };
};

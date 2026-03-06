import { useState, useEffect } from 'react';
import { apiRequest } from '@/src/shared/api';

export interface HowItWorksContent {
  _id: string;
  key: string;
  type: 'video' | 'image';
  contentType: 'video' | 'guide' | 'faq' | 'feature';
  url: string;
  title: string;
  description?: string;
  section: string;
  subsection?: string;
  category?: string;
  order: number;
  isActive: boolean;
  steps?: {
    stepNumber: number;
    title: string;
    description: string;
    icon?: string;
    duration?: string;
    tips?: string[];
  }[];
  faqs?: {
    question: string;
    answer: string;
    order: number;
  }[];
  features?: string[];
  estimatedTime?: string;
  difficulty?: 'easy' | 'medium' | 'advanced';
  tags?: string[];
}

export function useHowItWorksContent() {
  const [content, setContent] = useState<HowItWorksContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const data = await apiRequest<HowItWorksContent[]>('/site-content/how-it-works');
        setContent(
          data
            .filter((item) => item.isActive)
            .sort((a, b) => a.order - b.order)
        );
      } catch {
        // Silently fail - we'll show static fallback content
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, []);

  return { content, isLoading };
}

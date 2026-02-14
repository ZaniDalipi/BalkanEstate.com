import { useState, useEffect } from 'react';
import { API_URL } from '@/src/shared/api/config';

export interface ShowcaseImage {
  _id: string;
  url: string;
  title: string;
  order: number;
}

export const useShowcaseImages = () => {
  const [images, setImages] = useState<ShowcaseImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch(`${API_URL}/site-content/homepage-showcase`);
        if (res.ok) {
          const data = await res.json();
          setImages(
            data
              .filter((item: any) => item.isActive !== false)
              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          );
        }
      } catch {
        // Silently fail — fallback content will be shown
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  return { images, loading };
};

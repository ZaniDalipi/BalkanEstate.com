import React, { useCallback, useMemo, useRef, useEffect, memo, useState } from 'react';
import { Property } from '@/types';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import Footer from '@/components/shared/Footer';

// Optimize Cloudinary URL for faster loading
const optimizeCloudinaryUrl = (url: string, width: number = 400): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  if (url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/w_${width},c_fill,f_auto,q_auto/`);
  }
  return url;
};

// Image preloader utility - preloads optimized images before they're needed
const preloadImages = (urls: string[]) => {
  urls.forEach(url => {
    if (url) {
      const img = new Image();
      img.src = optimizeCloudinaryUrl(url, 400);
    }
  });
};

interface VirtualizedPropertyGridProps {
  properties: Property[];
  onPropertyHover?: (propertyId: string | null) => void;
  containerHeight: number;
  columns?: 1 | 2;
  gap?: number;
  showFooter?: boolean;
}

// Memoized property item to prevent unnecessary re-renders
const PropertyItem = memo(({
  property,
  onHover,
}: {
  property: Property;
  onHover?: (id: string | null) => void;
}) => {
  const handleMouseEnter = useCallback(() => {
    onHover?.(property.id);
  }, [onHover, property.id]);

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ contain: 'layout style paint' }}
    >
      <PropertyCard property={property} />
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.property.id === nextProps.property.id &&
         prevProps.onHover === nextProps.onHover;
});

PropertyItem.displayName = 'PropertyItem';

// Batch size for loading more items
const INITIAL_BATCH = 20; // Render 20 items initially (10 rows of 2)
const LOAD_MORE_BATCH = 20; // Load 20 more at a time

const VirtualizedPropertyGrid: React.FC<VirtualizedPropertyGridProps> = ({
  properties,
  onPropertyHover,
  containerHeight,
  columns = 1,
  gap = 24,
  showFooter = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);

  // Calculate how many to show
  const displayedProperties = useMemo(() => {
    return properties.slice(0, visibleCount);
  }, [properties, visibleCount]);

  const hasMore = visibleCount < properties.length;

  // Reset visible count when properties change
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
    // Preload first batch of images
    const initialPreload = Math.min(INITIAL_BATCH + 10, properties.length);
    const urls = properties.slice(0, initialPreload).map(p => p.imageUrl).filter(Boolean) as string[];
    preloadImages(urls);
  }, [properties]);

  // Preload next batch of images when visible count changes
  useEffect(() => {
    if (visibleCount < properties.length) {
      const nextBatchEnd = Math.min(visibleCount + LOAD_MORE_BATCH, properties.length);
      const urls = properties.slice(visibleCount, nextBatchEnd).map(p => p.imageUrl).filter(Boolean) as string[];
      preloadImages(urls);
    }
  }, [visibleCount, properties]);

  // IntersectionObserver to load more when scrolling near bottom
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + LOAD_MORE_BATCH, properties.length));
        }
      },
      {
        root: containerRef.current,
        rootMargin: '400px', // Start loading 400px before reaching the trigger
        threshold: 0,
      }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, properties.length]);

  // Group properties into rows
  const rows = useMemo(() => {
    const result: Property[][] = [];
    for (let i = 0; i < displayedProperties.length; i += columns) {
      result.push(displayedProperties.slice(i, i + columns));
    }
    return result;
  }, [displayedProperties, columns]);

  if (properties.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="virtualized-property-list overflow-y-auto"
      style={{ height: containerHeight, width: '100%' }}
    >
      <div className="px-4 pt-4">
        {rows.map((row, rowIndex) => (
          <div
            key={`row-${rowIndex}-${row[0]?.id}`}
            className="grid gap-5 mb-5"
            style={{
              gridTemplateColumns: columns === 2 ? '1fr 1fr' : '1fr',
              gap: `${gap}px`,
            }}
          >
            {row.map((property) => (
              <PropertyItem
                key={property.id}
                property={property}
                onHover={onPropertyHover}
              />
            ))}
          </div>
        ))}

        {/* Load more trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
            <div className="text-neutral-400 text-sm">Loading more...</div>
          </div>
        )}

        {/* Footer */}
        {showFooter && !hasMore && (
          <div className="pt-8">
            <Footer contained />
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(VirtualizedPropertyGrid);

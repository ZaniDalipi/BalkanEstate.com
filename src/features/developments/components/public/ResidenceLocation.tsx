import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Development } from '../../types';

const Map3DBuildings = lazy(() => import('@/features/map/components/Map3DBuildings'));

interface ResidenceLocationProps {
  development: Development;
}

/** Mount the heavy WebGL map only once it is close to the viewport. */
function useNearViewport<T extends HTMLElement>(ref: React.RefObject<T | null>): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '500px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, near]);
  return near;
}

/**
 * Location section for the public residence page: an interactive 3D map of the
 * development's surroundings, reusing the app's property map. Renders nothing
 * when the development has no coordinates. The map is lazy-loaded and only
 * mounts near the viewport, so it never costs visitors who don't scroll to it.
 */
export const ResidenceLocation: React.FC<ResidenceLocationProps> = ({ development }) => {
  const { t } = useTranslation('developments');
  const ref = useRef<HTMLDivElement>(null);
  const near = useNearViewport(ref);

  const hasCoords =
    development.lat != null &&
    development.lng != null &&
    !Number.isNaN(development.lat) &&
    !Number.isNaN(development.lng);

  if (!hasCoords) return null;

  const address = [development.address, development.city, development.country].filter(Boolean).join(', ');
  const heightClassName = 'h-[420px] sm:h-[520px]';

  return (
    <section id="location" aria-labelledby="location-heading" className="mt-10 scroll-mt-20">
      <h2 id="location-heading" className="mb-4 text-2xl font-bold text-foreground">
        {t('detail.location')}
      </h2>
      <div ref={ref} className="overflow-hidden rounded-2xl border border-border">
        {near ? (
          <Suspense
            fallback={<div className={`${heightClassName} animate-pulse bg-muted`} aria-hidden="true" />}
          >
            <Map3DBuildings
              lat={development.lat as number}
              lng={development.lng as number}
              address={address}
              title={development.name}
              heightClassName={heightClassName}
              zoom={16}
              pitch={55}
              bearing={-18}
            />
          </Suspense>
        ) : (
          <div className={`${heightClassName} bg-muted`} aria-hidden="true" />
        )}
      </div>
    </section>
  );
};

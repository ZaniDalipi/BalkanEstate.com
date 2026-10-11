import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Footer from '@/components/shared/Footer';
import { ErrorBoundary } from '@/src/app/components/ErrorBoundary';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { createLogger } from '@/shared/utils/logger';
import { findGuide } from '../utils/guideSelectors';
import CountryGuideDetail from './CountryGuideDetail';
import GuideNotFound from './GuideNotFound';
import GuidesIndex from './GuidesIndex';

const log = createLogger('BuyingGuides');

/**
 * `/guides` and `/guides/:slug`. The URL alone decides what shows: the index,
 * one country's guide, or a not-found state for a slug that is malformed or
 * names no guide (validated in `findGuide`).
 */
const BuyingGuidesPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();

  // The guides used to be one long page with `#montenegro` anchors, and those
  // links are published (sitemap, shared links). Send them to the country page.
  useEffect(() => {
    if (slug || typeof window === 'undefined') return;
    const anchor = window.location.hash.slice(1);
    if (!anchor) return;
    const legacy = findGuide(anchor);
    if (legacy.status === 'found') navigate(paths.guide(legacy.guide.slug), { replace: true });
  }, [slug]);

  const lookup = useMemo(() => (slug === undefined ? null : findGuide(slug)), [slug]);
  useEffect(() => {
    if (lookup && lookup.status !== 'found') {
      log.warn('Guide not found', lookup.status === 'invalid' ? { error: lookup.error } : { slug: lookup.slug });
    }
  }, [lookup]);

  let content: React.ReactNode;
  if (!lookup) content = <GuidesIndex />;
  else if (lookup.status === 'found') content = <CountryGuideDetail guide={lookup.guide} index={lookup.index} />;
  else content = <GuideNotFound slug={lookup.status === 'not-found' ? lookup.slug : undefined} />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Keyed by slug so a render error in one guide doesn't stick when the reader moves to another. */}
      <ErrorBoundary level="feature" key={slug ?? 'index'}>
        {content}
      </ErrorBoundary>
      <Footer />
    </div>
  );
};

export default BuyingGuidesPage;

import { useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import type { Development } from '../../../types';
import { arrivalSection } from '../../../utils/residenceSections';
import type { NavSection } from './ResidenceNav';

/** Wait for the page (and the app's own scroll to the top) before scrolling to a section. */
const ARRIVAL_DELAY_MS = 80;

export const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/**
 * The residence page's sections. "The builder" opens the company's own page;
 * the others scroll there. Arriving from the company page with a section
 * asked for (history state), the page scrolls to it once it has loaded.
 */
export function useResidenceSections(development: Development | undefined) {
  const { t } = useTranslation('developments');
  const location = useLocation();
  const slug = development?.slug;
  const hasBuilder = !!development?.builder?.name;

  const sections: NavSection[] = useMemo(
    () => [
      ...(hasBuilder ? [{ id: 'builder', label: t('builderPublic.label', 'The builder') }] : []),
      { id: 'overview', label: t('detail.overview', 'Overview') },
      { id: 'units', label: t('units.heading', 'Available homes') },
      { id: 'location', label: t('detail.location', 'Location') },
    ],
    [hasBuilder, t]
  );

  const openDeveloper = useCallback(() => {
    if (slug) navigate(paths.developmentDeveloper(slug));
  }, [slug]);
  const onSection = useCallback((id: string) => (id === 'builder' ? openDeveloper() : scrollToSection(id)), [openDeveloper]);

  const arrival = arrivalSection(location.state);
  const ready = !!development;
  useEffect(() => {
    if (!ready || !arrival) return undefined;
    const timer = window.setTimeout(() => scrollToSection(arrival), ARRIVAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [ready, arrival]);

  return { sections, onSection, openDeveloper: hasBuilder ? openDeveloper : undefined };
}

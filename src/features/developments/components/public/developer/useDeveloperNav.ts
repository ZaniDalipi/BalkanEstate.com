import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { goBack, navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import type { Development } from '../../../types';
import { isResidenceSection, sectionState } from '../../../utils/residenceSections';
import type { NavSection } from '../hero/ResidenceNav';

/**
 * The residence's bar on the company page: the same sections, "The builder"
 * marked as the page on show. Another section goes back to the residence page
 * and opens there; Back returns to the residence (history back when the buyer
 * came from it, so it lands where they were).
 */
export function useDeveloperNav(development: Development | undefined) {
  const { t } = useTranslation('developments');
  const slug = development?.slug ?? '';

  const sections: NavSection[] = useMemo(
    () => [
      { id: 'builder', label: t('builderPublic.label', 'The builder') },
      { id: 'overview', label: t('detail.overview', 'Overview') },
      { id: 'units', label: t('units.heading', 'Available homes') },
      { id: 'location', label: t('detail.location', 'Location') },
    ],
    [t]
  );

  const residence = paths.development(slug);
  const onSection = (id: string) => {
    if (id === 'builder') window.scrollTo({ top: 0, behavior: 'smooth' });
    else if (isResidenceSection(id)) navigate(residence, { state: sectionState(id) });
  };
  const onBack = () => goBack(residence);
  const backLabel = development ? t('builderPublic.backTo', { name: development.name, defaultValue: 'Back to {{name}}' }) : undefined;
  return { sections, onSection, onBack, backLabel, current: 'builder' };
}

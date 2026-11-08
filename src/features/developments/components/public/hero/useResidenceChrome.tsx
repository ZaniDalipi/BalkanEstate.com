import React from 'react';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import type { Development, UnitsSummary } from '../../../types';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { ResidenceHero } from '../ResidenceHero';
import { ResidenceTitleBar } from '../explorer/ResidenceTitleBar';
import { ResidenceIntro } from './ResidenceIntro';
import { ResidenceNav, type NavSection } from './ResidenceNav';

interface Args {
  development?: Development;
  summary?: UnitsSummary;
  sections: NavSection[];
  onSection: (id: string) => void;
}

/**
 * What surrounds the explorer at the top of a residence page. On desktop the
 * residence opens as its own full-screen page: its bar and headline lie over
 * the rendering, and the bar also tops the page when there is no rendering.
 * Phones keep the title strip above the picture, with the app's back button.
 */
export function useResidenceChrome({ development, summary, sections, onSection }: Args) {
  const desktop = useIsDesktop();
  if (!development) return { desktop, header: null, fallback: null, immersive: undefined };

  const onBack = () => navigate(paths.developments(), { direction: 'back' });
  const nav = (tone: 'picture' | 'paper') => (
    <ResidenceNav development={development} sections={sections} onSection={onSection} onBack={onBack} tone={tone} />
  );
  const hero = (
    <div className="mx-auto max-w-6xl px-4">
      <ResidenceHero development={development} onViewUnits={() => onSection('units')} />
    </div>
  );

  if (!desktop) {
    return {
      desktop,
      header: (
        <ResidenceTitleBar
          development={development}
          summary={summary}
          onViewUnits={() => onSection('units')}
          onViewBuilder={development.builder?.name ? () => onSection('builder') : undefined}
        />
      ),
      fallback: hero,
      immersive: undefined,
    };
  }
  return {
    desktop,
    header: nav('paper'),
    fallback: (
      <>
        {nav('paper')}
        <div className="pt-4">{hero}</div>
      </>
    ),
    immersive: { nav: nav('picture'), intro: <ResidenceIntro development={development} summary={summary} /> },
  };
}

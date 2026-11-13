import type { DetailKind } from '@/src/app/router/useRouteView';
import type { HintPage } from './hintCatalog';

/** Which tips belong to the page on screen. */
export function hintPageFor(view: string, detail?: DetailKind): HintPage {
  if (detail === 'property') return 'property';
  if (!detail && view === 'search') return 'search';
  return 'global';
}

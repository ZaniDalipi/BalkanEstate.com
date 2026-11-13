import { HINTS, type HintDef, type HintPage } from './hintCatalog';
import { hintFitsDevice, type DeviceTraits } from './hintDevice';

export interface HintGroup {
  page: HintPage;
  /** The group is the page on screen. */
  current: boolean;
  hints: HintDef[];
}

const ORDER: HintPage[] = ['property', 'search', 'global'];

/** Every tip for this device, grouped by page, the page on screen first. */
export function groupHints(page: HintPage, device: DeviceTraits, catalog: readonly HintDef[] = HINTS): HintGroup[] {
  const pages = [page, ...ORDER.filter((p) => p !== page)];
  return pages
    .map((p) => ({ page: p, current: p === page, hints: catalog.filter((h) => h.page === p && hintFitsDevice(h, device)) }))
    .filter((g) => g.hints.length > 0);
}

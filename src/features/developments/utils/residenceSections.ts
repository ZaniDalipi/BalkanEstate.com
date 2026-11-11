/** Sections of the residence page a link from elsewhere (the company page) may ask to show. */
export const RESIDENCE_SECTIONS = ['overview', 'units', 'location'] as const;
export type ResidenceSectionId = (typeof RESIDENCE_SECTIONS)[number];

const isSection = (value: unknown): value is ResidenceSectionId => RESIDENCE_SECTIONS.includes(value as ResidenceSectionId);

/** The history state that asks the residence page to open at a section. */
export const sectionState = (section: ResidenceSectionId) => ({ section });

/**
 * The section the residence page was asked to open at (history state from
 * `sectionState`), or null. Anything else in the state is ignored, so a
 * crafted state can only ever pick one of the known sections.
 */
export function arrivalSection(state: unknown): ResidenceSectionId | null {
  if (typeof state !== 'object' || state === null) return null;
  const section = (state as Record<string, unknown>).section;
  return isSection(section) ? section : null;
}

/** Whether a nav section id is one the residence page itself shows. */
export const isResidenceSection = isSection;

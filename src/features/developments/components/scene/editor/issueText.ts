import type { HotspotIssue } from '../../../types';
import type { EditorIssueCode } from '../../../hooks/usePolygonEditor';

/** Minimal translate signature (any `t` from useTranslation fits). */
export type Translate = (key: string, defaultValue: string) => string;

export type AnyIssueCode = EditorIssueCode | HotspotIssue['code'];

// Partial so a server code added later still renders (generic text) instead of breaking the build.
const DEFAULTS: Partial<Record<AnyIssueCode, string>> = {
  non_finite: 'Invalid coordinates',
  out_of_bounds: 'Outside the image',
  invalid_rect: 'Invalid rectangle',
  too_few_points: 'Needs at least 3 points',
  too_many_points: 'Too many points',
  duplicate_points: 'Two points overlap',
  zero_area: 'Too small',
  self_intersecting: 'Edges cross each other',
  missing_link: 'Missing link',
  invalid_link_type: 'Invalid link type',
  link_not_found: 'Linked item no longer exists',
  invalid_shape: 'Invalid shape',
  too_many_hotspots: 'Too many regions in this view',
  invalid_id: 'Invalid region id',
  invalid_label: 'Label is too long',
} as Partial<Record<AnyIssueCode, string>>;

/** Human text for a local or server-side region issue. */
export const issueText = (t: Translate, code: AnyIssueCode): string =>
  t(`editor.issues.${code}`, DEFAULTS[code] ?? 'This region is invalid');

export const ISSUE_DEFAULTS = DEFAULTS;

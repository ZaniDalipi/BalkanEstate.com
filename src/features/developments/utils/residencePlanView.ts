/**
 * What the dashboard shows for a residence's Residence Pass state: whether
 * another building fits, whether extras need a pass first, and which banner
 * (if any) belongs at the top of the manage page. Pure; the server decides.
 */
import type { DevelopmentStatus, ResidenceBilling } from '../types';

/** Show the "trial ends soon" banner from this many days before the end. */
export const ENDING_SOON_DAYS = 5;

export const canAddBuilding = (b: ResidenceBilling): boolean => b.buildings.used < b.buildings.limit;

/** Extra buildings are added to a pass (or plan); without one, the pass comes first. */
export const extrasNeedPass = (b: ResidenceBilling): boolean => b.state !== 'active' && b.state !== 'included' && b.state !== 'agency';

export type PlanBanner = 'endingSoon' | 'agencyGrace' | 'offline' | null;

export function planBanner(b: ResidenceBilling, status: DevelopmentStatus): PlanBanner {
  if (status === 'published' && !b.publicNow && b.state === 'expired') return 'offline';
  if (b.state === 'trial' && b.daysLeft !== null && b.daysLeft <= ENDING_SOON_DAYS) return 'endingSoon';
  // The agency's subscription ended: its free residences are in their grace period.
  if (b.state === 'agency' && b.agency && !b.agency.subscribed) return 'agencyGrace';
  return null;
}

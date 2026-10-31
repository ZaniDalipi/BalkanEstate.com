/**
 * Where a notification leads when it is clicked, or null when it leads
 * nowhere. One function for both the click and the "is this clickable" look,
 * so the two can never disagree. Paths come from the server, so only
 * same-origin paths are followed.
 */
import { paths } from '@/src/app/router/paths';

export interface NotificationTargetInput {
  type: string;
  data?: Record<string, unknown> | null;
}

export interface NotificationTarget {
  path: string;
  direction: 'up' | 'morph';
}

const AGENCY_TYPES = new Set(['agency_join_request', 'agent_joined_agency', 'agent_left_agency', 'agency_join_welcome', 'agency_coupon_redeemed']);
const VIEWING_TYPES = new Set(['new_viewing', 'viewing_approved', 'viewing_declined']);
/** Notifications about the owner's own residence open its dashboard. */
const RESIDENCE_OWNER_TYPES = new Set(['residence_trial_reminder', 'residence_offline', 'residence_agency_grace']);

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);
const isLocalPath = (p: string) => /^\/(?!\/)/.test(p);

export function notificationTarget({ type, data }: NotificationTargetInput): NotificationTarget | null {
  if (VIEWING_TYPES.has(type)) return { path: paths.account('viewings'), direction: 'morph' };
  if (!data) return null;

  const agencyId = str(data.agencyId);
  if (agencyId && AGENCY_TYPES.has(type)) return { path: paths.agency(str(data.agencySlug) ?? agencyId), direction: 'up' };

  const propertyId = str(data.propertyId);
  if (propertyId) return { path: paths.property(propertyId), direction: 'up' };

  if (str(data.conversationId)) return { path: paths.inbox(), direction: 'morph' };

  const actionUrl = str(data.actionUrl);
  if (actionUrl && isLocalPath(actionUrl)) {
    const detail = /^\/(property|agencies|developments)\//.test(actionUrl);
    return { path: actionUrl, direction: detail ? 'up' : 'morph' };
  }

  // Residence notifications stored before they carried a link.
  const slug = str(data.developmentSlug);
  if (slug) {
    const unitId = str(data.unitId);
    return { path: `${paths.development(slug)}${unitId ? `?unit=${encodeURIComponent(unitId)}` : ''}`, direction: 'up' };
  }
  const developmentId = str(data.developmentId);
  if (developmentId && RESIDENCE_OWNER_TYPES.has(type)) return { path: paths.developmentManage(developmentId), direction: 'morph' };

  return null;
}

import DevelopmentFollow, { type IFollowFilters } from '../../models/DevelopmentFollow';
import { IDevelopmentUnit } from '../../models/DevelopmentUnit';
import { createNotificationWithPush } from '../engagementService';
import { createLogger } from '../../utils/logger';
import { encodeId } from '../../utils/idObfuscation';

const log = createLogger('DevelopmentAlertService');

/**
 * Whether a unit passes a follower's filters. Pure and exported so it can be
 * unit-tested. An undefined bound is "no constraint"; a bound on a field the
 * unit does not have excludes the unit (a buyer asking for "2+ beds" should not
 * be alerted about a unit with no bedroom count).
 */
export const unitMatchesFilters = (
  unit: Pick<IDevelopmentUnit, 'beds' | 'price' | 'totalArea' | 'netArea' | 'grossArea'> & {
    priceVisibility?: string;
  },
  filters: IFollowFilters | undefined
): boolean => {
  if (!filters) return true;
  const area = unit.netArea ?? unit.totalArea ?? unit.grossArea;

  const within = (
    value: number | undefined,
    min: number | undefined,
    max: number | undefined
  ): boolean => {
    if (min === undefined && max === undefined) return true;
    if (value === undefined) return false;
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  };

  return (
    within(unit.beds, filters.minBeds, filters.maxBeds) &&
    // An on-request price is confidential: price bands must not match on it,
    // or which followers get alerted would reveal the price.
    within(unit.priceVisibility === 'on_request' ? undefined : unit.price, filters.minPrice, filters.maxPrice) &&
    within(area, filters.minArea, filters.maxArea)
  );
};

/**
 * Notify followers that a unit in a development became available. Respects each
 * follower's opt-in (newUnits / availabilityChanges) and filters. Best-effort:
 * never throws into the caller's request path.
 */
export const notifyFollowersUnitAvailable = async (params: {
  developmentId: string;
  developmentName: string;
  developmentSlug: string;
  unit: IDevelopmentUnit;
}): Promise<void> => {
  try {
    const follows = await DevelopmentFollow.find({
      developmentId: params.developmentId,
    }).lean();

    const recipients = follows.filter(
      (f) =>
        (f.preferences?.newUnits || f.preferences?.availabilityChanges) &&
        unitMatchesFilters(params.unit, f.filters)
    );

    if (recipients.length === 0) return;

    await Promise.allSettled(
      recipients.map((f) =>
        createNotificationWithPush({
          userId: f.userId,
          type: 'development_unit_available',
          title: `New home available at ${params.developmentName}`,
          message: `Unit ${params.unit.unitNumber} is now available.`,
          icon: 'home',
          priority: 'normal',
          data: {
            developmentSlug: params.developmentSlug,
            unitId: encodeId(String(params.unit._id)),
          },
        })
      )
    );
    log.info(
      `Notified ${recipients.length} follower(s) about unit ${params.unit.unitNumber} in ${params.developmentId}`
    );
  } catch (err) {
    log.error('Failed to notify followers of available unit:', err);
  }
};

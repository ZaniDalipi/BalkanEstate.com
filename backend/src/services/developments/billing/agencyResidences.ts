/**
 * Agencies' free residences, against the database: the agency's subscription
 * facts, claiming this year's free residence (atomic), the allowance an admin
 * sees and adjusts, and remembering when a subscription ended so the grace
 * period has a fixed start.
 */
import mongoose from 'mongoose';
import Agency from '../../../models/Agency';
import AgencyResidenceYear from '../../../models/AgencyResidenceYear';
import { addMonths } from './residencePlan';
import { agencyCoverageEnd, agencySubscribed, agencyYearStart, type AgencySubscriptionFacts } from './agencyYear';

type Id = mongoose.Types.ObjectId | string;

interface AgencyFacts {
  _id: mongoose.Types.ObjectId;
  name?: string;
  subscription?: AgencySubscriptionFacts;
  residenceEndedAt?: Date | null;
}

export const loadAgency = (agencyId: Id) =>
  Agency.findById(agencyId).select('name subscription residenceEndedAt').lean<AgencyFacts>();

/**
 * Remember when the subscription ended (first time it is seen ended), and
 * forget it on renewal, so the 15-day grace starts on a fixed date.
 */
export async function syncAgencyEnded(agency: AgencyFacts, now: Date): Promise<Date | null> {
  const subscribed = agencySubscribed(agency.subscription, now);
  if (subscribed && agency.residenceEndedAt) {
    await Agency.updateOne({ _id: agency._id }, { $unset: { residenceEndedAt: 1 } });
    return null;
  }
  if (!subscribed && !agency.residenceEndedAt) {
    const exp = agency.subscription?.expiresAt;
    const endedAt = exp && exp <= now ? exp : now;
    await Agency.updateOne({ _id: agency._id }, { $set: { residenceEndedAt: endedAt } });
    return endedAt;
  }
  return subscribed ? null : agency.residenceEndedAt ?? null;
}

/** Until when an agency's free residences are public (null: not covered). */
export async function agencyCoverage(agencyId: Id, now: Date): Promise<Date | null> {
  const agency = await loadAgency(agencyId);
  if (!agency) return null;
  const endedAt = await syncAgencyEnded(agency, now);
  return agencyCoverageEnd(agency.subscription, endedAt, now);
}

const yearDoc = async (agencyId: Id, yearStart: Date) => {
  try {
    await AgencyResidenceYear.updateOne({ agencyId, yearStart }, { $setOnInsert: { used: 0, extra: 0 } }, { upsert: true });
  } catch (error) {
    // Two requests creating the same year at once: the other one won, which is fine.
    if ((error as { code?: number }).code !== 11000) throw error;
  }
};

/**
 * Take one of this subscription year's free residences, if one is left.
 * Returns the year it was taken from, or null.
 */
export async function claimAgencySlot(agencyId: Id, perYear: number, now: Date): Promise<Date | null> {
  const agency = await loadAgency(agencyId);
  if (!agency?.subscription || !agencySubscribed(agency.subscription, now)) return null;
  const yearStart = agencyYearStart(agency.subscription, now);
  await yearDoc(agencyId, yearStart);
  const claimed = await AgencyResidenceYear.findOneAndUpdate(
    { agencyId, yearStart, $expr: { $lt: ['$used', { $add: [perYear, '$extra'] }] } },
    { $inc: { used: 1 } }
  );
  return claimed ? yearStart : null;
}

export interface AgencyAllowance {
  agencyId: string;
  agencyName?: string;
  subscribed: boolean;
  yearStart: Date | null;
  yearEnd: Date | null;
  perYear: number;
  extra: number;
  used: number;
  allowed: number;
  left: number;
  coveredUntil: Date | null;
}

export async function agencyAllowance(agencyId: Id, perYear: number, now: Date): Promise<AgencyAllowance | null> {
  const agency = await loadAgency(agencyId);
  if (!agency) return null;
  const subscribed = agencySubscribed(agency.subscription, now);
  const yearStart = agency.subscription && subscribed ? agencyYearStart(agency.subscription, now) : null;
  const year = yearStart ? await AgencyResidenceYear.findOne({ agencyId, yearStart }).lean() : null;
  const used = year?.used ?? 0;
  const extra = year?.extra ?? 0;
  const allowed = subscribed ? perYear + extra : 0;
  return {
    agencyId: String(agency._id),
    agencyName: agency.name,
    subscribed,
    yearStart,
    yearEnd: yearStart ? addMonths(yearStart, 12) : null,
    perYear,
    extra,
    used,
    allowed,
    left: Math.max(0, allowed - used),
    coveredUntil: agencyCoverageEnd(agency.subscription, agency.residenceEndedAt, now),
  };
}

/** Admin: give an agency extra free residences for its current subscription year. */
export async function addAgencyExtra(agencyId: Id, extra: number, note: string | undefined, adminId: Id, now: Date): Promise<boolean> {
  const agency = await loadAgency(agencyId);
  if (!agency?.subscription || !agencySubscribed(agency.subscription, now)) return false;
  const yearStart = agencyYearStart(agency.subscription, now);
  await yearDoc(agencyId, yearStart);
  await AgencyResidenceYear.updateOne(
    { agencyId, yearStart },
    { $inc: { extra }, $push: { notes: { at: now, by: new mongoose.Types.ObjectId(String(adminId)), extra, note } } }
  );
  return true;
}

/** The agency (if any) a user creates residences for: one they own or administer. */
export async function agencyOfUser(userId: Id): Promise<mongoose.Types.ObjectId | null> {
  const agency = await Agency.findOne({ $or: [{ ownerId: userId }, { admins: userId }] }).select('_id').lean();
  return agency ? (agency._id as mongoose.Types.ObjectId) : null;
}

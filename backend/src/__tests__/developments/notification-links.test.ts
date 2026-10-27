/** Residence notifications carry a link, so clicking one opens something useful. */
import Notification from '../../models/Notification';
import Development from '../../models/Development';
import DevelopmentFollow from '../../models/DevelopmentFollow';
import { notifyFollowersUnitAvailable, unitActionUrl } from '../../services/developments/developmentAlertService';
import { runResidenceBillingJob } from '../../services/developments/billing/residenceBillingJob';
import { encodeId, linkListing, makeListing, makeUser, setupDevelopment } from './helpers/explorerHarness';

describe('notification links', () => {
  it('an available unit links to its live listing when it has one', async () => {
    const t = await setupDevelopment({ published: true });
    const listing = await makeListing(t.owner._id, { status: 'active' });
    await linkListing(t.unit, listing._id, true);
    const unit = { _id: t.unit._id, primaryListingId: listing._id };
    expect(await unitActionUrl(t.dev.slug, unit as never)).toBe(`/property/${encodeId(String(listing._id))}`);
  });

  it('otherwise it opens the residence with the apartment selected', async () => {
    const t = await setupDevelopment({ published: true });
    const draft = await makeListing(t.owner._id, { status: 'draft' });
    const expected = `/developments/${t.dev.slug}?unit=${encodeURIComponent(encodeId(String(t.unit._id)))}`;
    expect(await unitActionUrl(t.dev.slug, { _id: t.unit._id } as never)).toBe(expected);
    expect(await unitActionUrl(t.dev.slug, { _id: t.unit._id, primaryListingId: draft._id } as never)).toBe(expected);
  });

  it('trial reminders link to the residence dashboard', async () => {
    const t = await setupDevelopment({ published: true });
    const dev = await Development.findById(t.devId);
    const shift = (d?: Date) => (d ? new Date(d.getTime() - 10 * 86_400_000) : d);
    await Development.updateOne(
      { _id: t.devId },
      { $set: { 'billing.trialStartedAt': shift(dev!.billing.trialStartedAt), 'billing.trialEndsAt': shift(dev!.billing.trialEndsAt), visibleUntil: shift(dev!.visibleUntil) } }
    );
    await runResidenceBillingJob();
    const n = await Notification.findOne({ userId: t.owner._id, type: 'residence_trial_reminder' }).lean();
    expect(n?.data?.actionUrl).toBe(`/dashboard/developments/${t.devEnc}`);
    // The bell translates it from these; title/message stay as the English fallback.
    expect(n?.data?.textKey).toBe('trialEndsSoon');
    expect(n?.data?.textParams).toMatchObject({ name: dev!.name, days: expect.any(Number) });
    expect(n?.data?.textParams.days).toBeGreaterThan(0);
  });

  it('a new-home alert carries its text key and values', async () => {
    const t = await setupDevelopment({ published: true });
    const buyer = await makeUser();
    await DevelopmentFollow.create({ developmentId: t.devId, userId: buyer._id });
    await notifyFollowersUnitAvailable({ developmentId: String(t.devId), developmentName: t.dev.name, developmentSlug: t.dev.slug, unit: t.unit as never });
    const n = await Notification.findOne({ userId: buyer._id, type: 'development_unit_available' }).lean();
    expect(n?.data).toMatchObject({ textKey: 'unitAvailable', textParams: { residence: t.dev.name, unit: t.unit.unitNumber } });
  });
});

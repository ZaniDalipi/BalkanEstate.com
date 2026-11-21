/**
 * The one place a payment becomes access.
 *
 * Used for a payment order the team marks paid, a 100%-off code, and (later)
 * an online payment. In a single transaction it:
 *   - records the payment once: the PaymentRecord is keyed by the payment's
 *     own reference, so the same payment can never be granted twice;
 *   - extends the same plan from its current end (paying early keeps the
 *     remaining days; paying during the grace period counts from the original
 *     end), or starts a new plan and ends the user's other web plans, adding
 *     the unused value of those as extra days;
 *   - sets the user's tier and limits from the product (Product.tier), not
 *     from words in the product id.
 * Coupons, welcome emails and the receipt follow after the commit
 * (planBenefits.ts).
 */
import mongoose, { ClientSession } from 'mongoose';
import Product, { IProduct } from '../../models/Product';
import User from '../../models/User';
import Subscription, { ISubscription, SubscriptionStore } from '../../models/Subscription';
import PaymentRecord, { IPaymentRecord } from '../../models/PaymentRecord';
import SubscriptionEvent from '../../models/SubscriptionEvent';
import { isGrantablePlan } from '../../utils/grantablePlans';
import { addBillingPeriod, addDays, renewalStart, GRACE_PERIOD_DAYS } from '../../utils/billingPeriod';
import { creditDaysForSwitch } from '../../utils/planSwitchCredit';
import { tierForProduct, UserPlanTier } from '../../utils/planTier';
import { ENTERPRISE_TIER_LIMITS, PRO_TIER_LIMITS } from '../../config/subscriptionConstants';
import { paymentLogger } from '../../utils/logger';
import { runPlanBenefits } from './planBenefits';

/** How the money (or the right to the plan) came in. */
export type GrantMethod =
  | 'bank_transfer'
  | 'cash'
  | 'card_terminal'
  | 'other'
  | 'paysera'
  | 'coupon'
  | 'free_grant'
  | 'stripe';

export interface GrantInput {
  userId: string | mongoose.Types.ObjectId;
  productId: string;
  /** Amount received for this period, in euros. */
  amount: number;
  currency?: string;
  /** Unique per payment: an order reference, a code redemption, a provider transaction id. */
  reference: string;
  method: GrantMethod;
  store?: SubscriptionStore;
  discountCode?: string;
  /** List price when a discount code was used. */
  originalAmount?: number;
  note?: string;
  /** Admin who confirmed it, when one did. */
  grantedBy?: string;
  /** When the money arrived, if earlier than the grant (the payment record's date). */
  paidAt?: Date;
  now?: Date;
  /**
   * Writes that must commit together with the grant, such as marking the
   * order paid. Throwing rolls the whole grant back.
   */
  alsoInTransaction?: (session: ClientSession, granted: { subscriptionId: string; paymentRecordId: string }) => Promise<void>;
}

export interface GrantResult {
  subscription: ISubscription;
  paymentRecord: IPaymentRecord;
  /** The same reference had already been granted; nothing changed this time. */
  alreadyGranted: boolean;
  /** First period of this plan, as opposed to a renewal. */
  isNew: boolean;
  expirationDate: Date;
  /** Days added for the unused value of plans this one replaced. */
  creditedDays: number;
}

export type GrantErrorCode = 'PRODUCT_NOT_FOUND' | 'PLAN_NOT_GRANTABLE' | 'USER_NOT_FOUND';

export class GrantError extends Error {
  constructor(public readonly code: GrantErrorCode, message: string) {
    super(message);
    this.name = 'GrantError';
  }
}

/** PaymentRecord only knows the app stores and the web. */
const recordStore = (store: SubscriptionStore): 'google' | 'apple' | 'web' =>
  store === 'google' || store === 'apple' ? store : 'web';

/** The user's `subscriptionSource` knows fewer stores than a subscription does. */
const sourceFor = (store: SubscriptionStore): 'google' | 'apple' | 'web' | 'stripe' | 'paddle' =>
  store === 'google' || store === 'apple' || store === 'stripe' || store === 'paddle' ? store : 'web';

const PLAN_STATUSES = ['active', 'grace', 'pending_cancellation', 'canceled'];

function listingsLimitFor(tier: UserPlanTier | null, product: IProduct): number | undefined {
  if (product.listingsLimit) return product.listingsLimit;
  if (tier === 'agency_owner') return ENTERPRISE_TIER_LIMITS.LISTINGS;
  if (tier === 'pro') {
    return product.billingPeriod === 'yearly' ? PRO_TIER_LIMITS.YEARLY.LISTINGS : PRO_TIER_LIMITS.MONTHLY.LISTINGS;
  }
  if (tier === 'agency_agent') return 30;
  return undefined;
}

async function findGranted(store: SubscriptionStore, reference: string) {
  const paymentRecord = await PaymentRecord.findOne({ store: recordStore(store), storeTransactionId: reference });
  if (!paymentRecord) return null;
  const subscription = await Subscription.findById(paymentRecord.subscriptionId);
  return subscription ? { paymentRecord, subscription } : null;
}

interface Granted extends Omit<GrantResult, 'alreadyGranted'> {
  tier: UserPlanTier | null;
  product: IProduct;
  user: { name?: string; email: string; agencyName?: string };
}

async function grantInSession(input: GrantInput, store: SubscriptionStore, session: ClientSession): Promise<Granted> {
  const now = input.now ?? new Date();
  const currency = input.currency || 'EUR';

  const product = await Product.findOne({ productId: input.productId }).session(session);
  if (!product) throw new GrantError('PRODUCT_NOT_FOUND', `Product not found: ${input.productId}`);
  if (store === 'web' && !isGrantablePlan(product)) {
    throw new GrantError('PLAN_NOT_GRANTABLE', `Product ${input.productId} is not a plan that can be granted`);
  }
  const user = await User.findById(input.userId).session(session);
  if (!user) throw new GrantError('USER_NOT_FOUND', `User not found: ${String(input.userId)}`);

  const tier = tierForProduct(product);
  const autoRenewing = store !== 'web'; // Web plans are prepaid: nothing charges them again.

  // The same plan, still running or in its grace period, is extended.
  const latestSamePlan = await Subscription.findOne({
    userId: user._id,
    productId: product.productId,
    store,
    status: { $in: PLAN_STATUSES },
  })
    .sort({ expirationDate: -1 })
    .session(session);
  const graceEnd = (s: ISubscription) => s.gracePeriodEndDate ?? addDays(s.expirationDate, GRACE_PERIOD_DAYS);
  const current = latestSamePlan
    && (latestSamePlan.expirationDate > now || (latestSamePlan.status === 'grace' && graceEnd(latestSamePlan) >= now))
    ? latestSamePlan
    : null;

  let subscription: ISubscription;
  let creditedDays = 0;
  const isNew = !current;

  if (current) {
    const start = renewalStart(now, current);
    current.expirationDate = addBillingPeriod(start, product.billingPeriod);
    current.renewalDate = current.expirationDate;
    current.status = 'active';
    current.autoRenewing = autoRenewing;
    current.price = input.amount;
    current.currency = currency;
    current.gracePeriodEndDate = undefined;
    current.willCancelAt = undefined;
    current.canceledAt = undefined;
    current.cancellationReason = undefined;
    // A new period gets its own reminders.
    current.renewalReminderSent = false;
    current.expiryReminderSent = false;
    current.expiryWarningSent = false;
    current.lastUpdated = now;
    await current.save({ session });
    subscription = current;
  } else {
    // A different plan replaces the user's other web plans; their unused value becomes extra days.
    const others = await Subscription.find({
      userId: user._id,
      store: 'web',
      productId: { $ne: product.productId },
      status: { $in: ['active', 'grace', 'pending_cancellation'] },
    }).session(session);
    for (const old of others) {
      const oldProduct = await Product.findOne({ productId: old.productId }).session(session).lean();
      const credit = creditDaysForSwitch({
        paidForOldPeriod: old.price ?? 0,
        oldPeriod: oldProduct?.billingPeriod,
        oldExpiresAt: old.expirationDate,
        newPrice: product.price,
        newPeriod: product.billingPeriod,
        now,
      });
      creditedDays += credit;
      old.status = 'canceled';
      old.autoRenewing = false;
      old.canceledAt = now;
      old.cancellationReason = `Replaced by ${product.productId}`;
      if (old.expirationDate > now) old.expirationDate = now;
      old.lastUpdated = now;
      await old.save({ session });
      await SubscriptionEvent.create(
        [{
          subscriptionId: old._id,
          userId: user._id,
          eventType: 'subscription_canceled',
          store: 'web',
          productId: old.productId,
          metadata: { reason: 'plan_switch', newProductId: product.productId, creditedDays: credit },
        }],
        { session }
      );
    }

    const expirationDate = addDays(addBillingPeriod(now, product.billingPeriod), creditedDays);
    [subscription] = await Subscription.create(
      [{
        userId: user._id,
        store,
        productId: product.productId,
        googlePlayProductId: product.googlePlayProductId,
        appStoreProductId: product.appStoreProductId,
        startDate: now,
        expirationDate,
        renewalDate: expirationDate,
        status: 'active',
        autoRenewing,
        price: input.amount,
        currency,
        transactionId: input.reference,
      }],
      { session }
    );
  }

  const [paymentRecord] = await PaymentRecord.create(
    [{
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      subscriptionId: subscription._id,
      store: recordStore(store),
      storeTransactionId: input.reference,
      transactionType: 'charge',
      transactionDate: input.paidAt ?? now,
      amount: input.amount,
      currency,
      status: 'completed',
      productId: product.productId,
      description: `Subscription payment for ${product.name}`,
      metadata: {
        method: input.method,
        renewal: !isNew,
        periodEnd: subscription.expirationDate,
        ...(creditedDays ? { creditedDays } : {}),
        ...(input.discountCode ? { discountCode: input.discountCode } : {}),
        ...(input.originalAmount !== undefined ? { originalAmount: input.originalAmount } : {}),
        ...(input.note ? { note: input.note } : {}),
        ...(input.grantedBy ? { grantedBy: input.grantedBy } : {}),
      },
    }],
    { session }
  );

  // The user record mirrors the plan.
  user.isSubscribed = true;
  user.subscriptionPlan = product.productId;
  user.subscriptionProductName = product.name;
  user.subscriptionSource = sourceFor(store);
  user.subscriptionExpiresAt = subscription.expirationDate;
  user.subscriptionStartedAt = subscription.startDate;
  user.activeSubscriptionId = subscription._id as mongoose.Types.ObjectId;
  user.lastPaymentDate = now;
  user.lastPaymentAmount = input.amount;
  user.totalPaid = (user.totalPaid || 0) + input.amount;
  user.subscriptionStatus = 'active';

  if (!user.subscription) user.subscription = {} as typeof user.subscription;
  user.subscription.status = 'active';
  user.subscription.expiresAt = subscription.expirationDate;
  user.subscription.startDate = subscription.startDate;
  if (tier) user.subscription.tier = tier;
  const listingsLimit = listingsLimitFor(tier, product);
  if (listingsLimit) {
    user.subscription.listingsLimit = listingsLimit;
    user.activeListingsLimit = listingsLimit;
  }
  if (product.savedSearchesLimit !== undefined) user.subscription.savedSearchesLimit = product.savedSearchesLimit;
  if (tier === 'pro' || tier === 'agency_owner' || tier === 'agency_agent') {
    // A paid period starts a fresh monthly listing count; published listings stay up.
    user.subscription.listingsCreatedThisMonth = 0;
    user.subscription.monthResetDate = now;
  }
  user.markModified('subscription');
  if (user.role && user.role !== 'buyer') {
    if (user.activeRole !== user.role) user.activeRole = user.role as typeof user.activeRole;
    if (user.primaryRole !== user.role) user.primaryRole = user.role as typeof user.primaryRole;
  }
  await user.save({ session });

  await SubscriptionEvent.create(
    [{
      subscriptionId: subscription._id,
      userId: user._id,
      eventType: isNew ? 'subscription_purchased' : 'subscription_renewed',
      store: recordStore(store),
      hasFinancialImpact: true,
      amount: input.amount,
      currency,
      productId: product.productId,
      metadata: {
        paymentRecordId: paymentRecord._id,
        reference: input.reference,
        method: input.method,
        expirationDate: subscription.expirationDate,
        ...(creditedDays ? { creditedDays } : {}),
      },
    }],
    { session }
  );

  return {
    subscription,
    paymentRecord,
    isNew,
    expirationDate: subscription.expirationDate,
    creditedDays,
    tier,
    product,
    user: { name: user.name, email: user.email, agencyName: user.agencyName },
  };
}

const isDuplicateKey = (error: unknown): boolean => (error as { code?: number })?.code === 11000;

export async function grantPaidPeriod(input: GrantInput): Promise<GrantResult> {
  const store = input.store ?? 'web';

  const existing = await findGranted(store, input.reference);
  if (existing) {
    return {
      ...existing,
      alreadyGranted: true,
      isNew: false,
      expirationDate: existing.subscription.expirationDate,
      creditedDays: 0,
    };
  }

  const session = await mongoose.startSession();
  let granted: Granted | undefined;
  try {
    await session.withTransaction(async () => {
      granted = await grantInSession(input, store, session);
      if (input.alsoInTransaction) {
        await input.alsoInTransaction(session, {
          subscriptionId: String(granted.subscription._id),
          paymentRecordId: String(granted.paymentRecord._id),
        });
      }
    });
  } catch (error) {
    // Another request granted the same reference at the same moment.
    if (isDuplicateKey(error)) {
      const raced = await findGranted(store, input.reference);
      if (raced) {
        return { ...raced, alreadyGranted: true, isNew: false, expirationDate: raced.subscription.expirationDate, creditedDays: 0 };
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }

  if (!granted) throw new Error('Grant transaction finished without a result');
  const result = granted;
  paymentLogger.info(
    `✅ Granted ${result.product.productId} to user ${String(input.userId)} (${input.method}, ${input.reference}) until ${result.expirationDate.toISOString()}`
  );

  // Not awaited: the plan is granted once the transaction commits. The emails
  // go through a rate-limited queue that can wait minutes between messages,
  // and the person clicking "Mark paid" or "Activate" must not wait for them.
  runPlanBenefits({
    userId: String(input.userId),
    user: result.user,
    product: result.product,
    tier: result.tier,
    isNewSubscription: result.isNew,
    startDate: result.subscription.startDate,
    expirationDate: result.expirationDate,
    receipt: {
      reference: input.reference,
      amount: input.amount,
      currency: input.currency || 'EUR',
      discountCode: input.discountCode,
      originalAmount: input.originalAmount,
      autoRenewing: result.subscription.autoRenewing,
    },
  }).catch((error) => paymentLogger.error(`⚠️ Plan benefits failed for ${input.reference}:`, error));

  return {
    subscription: result.subscription,
    paymentRecord: result.paymentRecord,
    alreadyGranted: false,
    isNew: result.isNew,
    expirationDate: result.expirationDate,
    creditedDays: result.creditedDays,
  };
}

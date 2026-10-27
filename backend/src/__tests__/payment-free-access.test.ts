/**
 * Regression tests: paid features can't be had without paying. Each block pins
 * one endpoint that used to grant a subscription, a promotion or agency
 * featuring to any signed-in user.
 */
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import Product from '../models/Product';
import Promotion from '../models/Promotion';
import Subscription from '../models/Subscription';
import User from '../models/User';
import AgencyFeaturedSubscription from '../models/AgencyFeaturedSubscription';
import { makeListing, makeUser, tokenFor } from './developments/helpers/explorerHarness';

const app = express();
app.use(express.json());
/* eslint-disable @typescript-eslint/no-var-requires */
app.use('/api/payments', require('../routes/paymentRoutes').default);
app.use('/api/subscriptions', require('../routes/subscriptionRoutes').default);
app.use('/api/promotions', require('../routes/promotionRoutes').default);
app.use('/api', require('../routes/agencyFeaturedSubscriptionRoutes').default);
/* eslint-enable @typescript-eslint/no-var-requires */

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('no free subscriptions', () => {
  it('the legacy mock endpoint POST /payments/process is gone', async () => {
    const user = await makeUser();
    const res = await request(app)
      .post('/api/payments/process')
      .set(auth(tokenFor(user._id)))
      .send({ planName: 'Seller Pro', planInterval: 'year' });
    expect(res.status).toBe(404);
    const after = await User.findById(user._id);
    expect(after?.isSubscribed).toBeFalsy();
  });

  it('POST /subscriptions with store "web" does not activate anything', async () => {
    await Product.create({
      productId: 'pro_monthly',
      name: 'Pro Monthly',
      description: 'Pro',
      price: 25,
      currency: 'EUR',
      billingPeriod: 'monthly',
      isActive: true,
    });
    const user = await makeUser();
    const res = await request(app)
      .post('/api/subscriptions')
      .set(auth(tokenFor(user._id)))
      .send({ productId: 'pro_monthly', store: 'web' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('WEB_PURCHASE_NOT_ALLOWED');
    expect(await Subscription.countDocuments({ userId: user._id })).toBe(0);
    expect((await User.findById(user._id))?.isSubscribed).toBeFalsy();
  });
});

describe('no free promotions', () => {
  it('POST /promotions refuses a paid promotion without payment', async () => {
    const user = await makeUser();
    const listing = await makeListing(user._id);
    const res = await request(app)
      .post('/api/promotions')
      .set(auth(tokenFor(user._id)))
      .send({ propertyId: String(listing._id), promotionTier: 'featured', duration: 7 });
    expect(res.status).toBe(402);
    expect(res.body.code).toBe('PAYMENT_REQUIRED');
    expect(res.body.amount).toBeGreaterThan(0);
    expect(await Promotion.countDocuments({ propertyId: listing._id })).toBe(0);
  });
});

describe('no free agency featuring', () => {
  it('only an admin can confirm a featured subscription payment', async () => {
    const agencyId = new mongoose.Types.ObjectId();
    const user = await makeUser();
    const res = await request(app)
      .post(`/api/agencies/${agencyId}/featured-subscription/confirm-payment`)
      .set(auth(tokenFor(user._id)))
      .send({ externalSubscriptionId: 'x', externalCustomerId: 'y' });
    expect(res.status).toBe(403);
    expect(await AgencyFeaturedSubscription.countDocuments({ agencyId, status: 'active' })).toBe(0);
  });
});

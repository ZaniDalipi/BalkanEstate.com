import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import { PRODUCTS } from './seedProducts';
import { findUnknownProducts } from '../utils/unknownProducts';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('ListUnknownProducts');

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';

/**
 * Lists products that are not in the seeded catalogue (scripts/seedProducts.ts)
 * and flags the ones the old payment code created on its own: the free-coupon
 * route, the Stripe handler and the Paysera callback used to make a Product out
 * of any unknown plan id (see utils/unknownProducts.ts). Those show on the
 * public pricing page.
 *
 * Also shows how many subscriptions point at each product, so you can see who
 * got a plan through one.
 *
 * Dry run unless `--apply` is passed. With `--apply` it only hides the flagged
 * products (isActive and isVisible set to false). It never deletes anything
 * and never touches subscriptions or products an admin created.
 *
 *   npm run products:unknown          # report
 *   npm run products:unknown:apply    # hide the flagged ones
 */
async function run(apply: boolean): Promise<void> {
  await mongoose.connect(MONGODB_URI);
  try {
    const products = await Product.find({})
      .select('productId name description price tier isActive isVisible createdAt')
      .lean();
    const rows = findUnknownProducts(products, PRODUCTS.map((p) => p.productId));

    if (rows.length === 0) {
      log.info('✅ Every product is in the seeded catalogue.');
      return;
    }

    log.info(`Found ${rows.length} product(s) not in the seeded catalogue:\n`);
    for (const row of rows) {
      const subscriptions = await Subscription.countDocuments({ productId: row.productId });
      log.info(
        `${row.likelyAutoCreated ? '⚠️  AUTO-CREATED' : '   admin-made?  '}  ${row.productId}` +
          `  | name "${row.name}" | €${row.price} | tier ${row.tier ?? '—'}` +
          ` | active ${row.isActive !== false} | visible ${row.isVisible !== false}` +
          ` | created ${row.createdAt ? new Date(row.createdAt).toISOString() : '—'}` +
          ` | ${subscriptions} subscription(s)`
      );
    }

    const flagged = rows.filter((row) => row.likelyAutoCreated).map((row) => row.productId);
    if (!apply) {
      log.info(`\nDry run. ${flagged.length} flagged product(s) would be hidden with --apply.`);
      return;
    }
    if (flagged.length === 0) {
      log.info('\nNothing flagged, nothing hidden.');
      return;
    }
    const result = await Product.updateMany(
      { productId: { $in: flagged } },
      { $set: { isActive: false, isVisible: false } }
    );
    log.info(`\n✅ Hid ${result.modifiedCount} flagged product(s). Subscriptions were not changed.`);
  } finally {
    await mongoose.disconnect();
  }
}

run(process.argv.includes('--apply')).catch((error) => {
  log.error('❌ Listing unknown products failed:', error);
  process.exit(1);
});

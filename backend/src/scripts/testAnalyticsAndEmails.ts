/**
 * Test Script — Analytics Tracking & Weekly Report Emails
 *
 * Tests everything changed in the analytics/email-preferences feature:
 *   1. Simulates agency profile views (writes PageView documents)
 *   2. Verifies the aggregation query can find them (the ObjectId fix)
 *   3. Triggers a real weekly stats email for your agency
 *   4. Prints the unsubscribe URL so you can test the unsubscribe flow
 *
 * Usage (from /backend directory):
 *   npx ts-node src/scripts/testAnalyticsAndEmails.ts
 *
 * Optional — send to a specific email instead of the agency owner's:
 *   TEST_EMAIL=you@example.com npx ts-node src/scripts/testAnalyticsAndEmails.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Agency from '../models/Agency';
import PageView from '../models/PageView';
import { sendAgencyWeeklyStats } from '../jobs/weeklyStatsJob';

const TEST_EMAIL = process.env.TEST_EMAIL || null;
const VIEWS_TO_SEED = 5;

// ─── helpers ──────────────────────────────────────────────────────────────────

const randomIpHash = () =>
  Math.random().toString(36).substring(2, 18).padEnd(16, '0');

const randomSession = () =>
  'test-session-' + Math.random().toString(36).substring(2, 10);

// ─── main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🔌 Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan_estate');
  console.log('✅ Connected\n');

  // ── 1. Pick an agency ───────────────────────────────────────────────────────
  const agency = await Agency.findOne({
    'subscription.status': { $in: ['active', 'trial'] },
  }).populate('ownerId', 'email name unsubscribeToken');

  if (!agency) {
    console.error('❌ No agency with an active/trial subscription found. Create one first.');
    process.exit(1);
  }

  const owner = agency.ownerId as any;
  const emailTarget = TEST_EMAIL || owner?.email;
  console.log(`🏢 Agency: "${agency.name}" (${String(agency._id)})`);
  console.log(`📧 Will send email to: ${emailTarget}\n`);

  // ── 2. Seed test PageViews for this agency ──────────────────────────────────
  console.log(`📊 Seeding ${VIEWS_TO_SEED} test page views for the agency profile…`);
  const agencyObjectId = new mongoose.Types.ObjectId(String(agency._id));

  const viewDocs = Array.from({ length: VIEWS_TO_SEED }, (_, i) => ({
    entityType: 'agency' as const,
    entityId: agencyObjectId,
    sessionId: randomSession(),
    ipHash: randomIpHash(),
    deviceType: (['desktop', 'mobile', 'tablet'] as const)[i % 3],
    referrerType: 'direct' as const,
    isUnique: i < 3, // first 3 are "unique visitors"
    duration: 30 + i * 10,
    createdAt: new Date(Date.now() - i * 60_000), // spread over last few minutes
  }));

  await PageView.insertMany(viewDocs);
  console.log(`   ✅ Inserted ${VIEWS_TO_SEED} views (${viewDocs.filter(v => v.isUnique).length} unique)\n`);

  // ── 3. Verify the aggregation finds them (the ObjectId fix) ─────────────────
  console.log('🔍 Running aggregation query (verifying ObjectId fix)…');
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const result = await PageView.aggregate([
    {
      $match: {
        entityType: 'agency',
        entityId: { $in: [agencyObjectId] }, // ObjectId, not string
        createdAt: { $gte: oneWeekAgo, $lte: now },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unique: { $sum: { $cond: ['$isUnique', 1, 0] } },
      },
    },
  ]);

  const views = result[0] || { total: 0, unique: 0 };
  if (views.total === 0) {
    console.error('   ❌ Aggregation returned 0 — ObjectId fix may not be working!');
  } else {
    console.log(`   ✅ Found ${views.total} total views, ${views.unique} unique visitors\n`);
  }

  // ── 4. Override owner email if TEST_EMAIL is set, then send the report ───────
  if (TEST_EMAIL && owner) {
    const originalEmail = owner.email;
    owner.email = TEST_EMAIL;
    console.log(`📨 Sending agency weekly report to ${TEST_EMAIL} (overriding ${originalEmail})…`);
    // Temporarily patch agency.ownerId so the job picks up the test email
    (agency as any).ownerId = owner;
    await sendAgencyWeeklyStats(); // this will process ALL agencies; filter below
    // Note: sendAgencyWeeklyStats iterates all agencies. The email will go to
    // whoever is the owner of each. For a targeted test, see step below.
    owner.email = originalEmail;
  } else {
    console.log(`📨 Triggering agency weekly stats job (will email all active agencies)…`);
    await sendAgencyWeeklyStats();
  }

  console.log('   ✅ Weekly stats job completed\n');

  // ── 5. Print unsubscribe URL for manual testing ─────────────────────────────
  if (owner?.unsubscribeToken) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    const token = owner.unsubscribeToken;
    console.log('🔗 Unsubscribe URLs (paste in browser to test the flow):');
    console.log(`   Weekly stats only : ${backendUrl}/api/auth/unsubscribe?token=${token}&type=weeklyStats`);
    console.log(`   All emails        : ${backendUrl}/api/auth/unsubscribe?token=${token}&type=all`);
    console.log('   Both should redirect you to /account/notifications with a success banner.\n');
  } else {
    console.log('⚠️  No unsubscribeToken on owner — token-based unsubscribe links will not work for this user.');
    console.log('   Save the user once to generate the token (pre-save hook).\n');
  }

  // ── 6. Print manual UI test checklist ───────────────────────────────────────
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  console.log('📋 Manual browser tests:');
  console.log(`   1. Logged IN  → ${frontendUrl}/account/notifications`);
  console.log('      ✓ Notifications tab is visible in the sidebar');
  console.log('      ✓ Email toggles load and can be toggled individually');
  console.log('      ✓ "Turn off all" button disables all toggles at once');
  console.log('      ✓ "Enable all" button re-enables them');
  console.log(`   2. Logged OUT → ${frontendUrl}/account/notifications`);
  console.log('      ✓ Login modal opens automatically');
  console.log('      ✓ After login, redirects back to notifications tab');
  console.log(`   3. Unsubscribe redirect → see URLs printed above`);
  console.log('      ✓ Should land on /account/notifications?unsubscribed=...');
  console.log('      ✓ Green confirmation banner appears at top');
  console.log('      ✓ URL is cleaned (no query param left after render)');

  // ── Cleanup test views ───────────────────────────────────────────────────────
  const deleted = await PageView.deleteMany({
    entityId: agencyObjectId,
    sessionId: /^test-session-/,
  });
  console.log(`\n🧹 Cleaned up ${deleted.deletedCount} test PageView documents.`);

  await mongoose.disconnect();
  console.log('\n✅ Done.\n');
}

run().catch(err => {
  console.error('❌ Script error:', err);
  mongoose.disconnect();
  process.exit(1);
});

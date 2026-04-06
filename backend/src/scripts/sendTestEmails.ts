/**
 * Send Test Emails Script
 *
 * Usage:
 *   npx ts-node src/scripts/sendTestEmails.ts [email-type]
 *
 * Email types:
 *   1 or agent-coupons    - Enterprise Agent Registration Coupons (5 codes)
 *   2 or welcome          - Enterprise Welcome/Thank You Email
 *   3 or promo-coupons    - Monthly Promotion Coupons Email
 *   all                   - Send all emails (default)
 *
 * Examples:
 *   npx ts-node src/scripts/sendTestEmails.ts 1
 *   npx ts-node src/scripts/sendTestEmails.ts agent-coupons
 *   npx ts-node src/scripts/sendTestEmails.ts welcome
 *   npx ts-node src/scripts/sendTestEmails.ts promo-coupons
 *   npx ts-node src/scripts/sendTestEmails.ts all
 */

import dotenv from 'dotenv';
import path from 'path';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('SendTestEmails');

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

import {
  sendAgentRegistrationCouponsEmail,
  sendEnterpriseWelcomeEmail,
  sendMonthlyCouponEmail
} from '../services/emailService';

// =============================================================================
// Configuration - Change this email to test
// =============================================================================
const TEST_EMAIL = 'zanoin@gmail.com';

// =============================================================================
// Test Data
// =============================================================================

const testAgencyOwner = {
  name: 'Zani Dalipi',
  email: TEST_EMAIL,
  agencyName: 'Dalipi Real Estate Agency',
};

// Generate 5 agent registration codes
const testAgentCoupons = [
  { code: 'AGENCY-DALP-X7K9M2', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  { code: 'AGENCY-DALP-B3N8P5', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  { code: 'AGENCY-DALP-Q2W4E6', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  { code: 'AGENCY-DALP-R8T1Y3', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  { code: 'AGENCY-DALP-U6I0O9', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
];

// Pro user for monthly coupons test
const testProUser = {
  name: 'Zani Dalipi',
  email: TEST_EMAIL,
  planName: 'Pro Yearly',
};

// =============================================================================
// Email Send Functions
// =============================================================================

async function sendAgentCouponsEmail() {
  log.info('\n📤 Sending Enterprise Agent Coupons Email...');
  log.info(`   To: ${TEST_EMAIL}`);
  log.info('   Contains 5 agent registration codes:');
  testAgentCoupons.forEach((coupon, i) => {
    log.info(`   ${i + 1}. ${coupon.code} (expires: ${coupon.expiresAt.toLocaleDateString('en-GB')})`);
  });

  await sendAgentRegistrationCouponsEmail({
    email: testAgencyOwner.email,
    ownerName: testAgencyOwner.name,
    agencyName: testAgencyOwner.agencyName,
    coupons: testAgentCoupons,
  });
  log.info('   ✅ Agent Registration Coupons email sent!');
}

async function sendWelcomeEmail() {
  log.info('\n📤 Sending Enterprise Welcome Email...');
  log.info(`   To: ${TEST_EMAIL}`);
  log.info(`   Agency: ${testAgencyOwner.agencyName}`);

  await sendEnterpriseWelcomeEmail({
    email: testAgencyOwner.email,
    ownerName: testAgencyOwner.name,
    agencyName: testAgencyOwner.agencyName,
  });
  log.info('   ✅ Enterprise Welcome email sent!');
}

async function sendPromoCouponsEmail() {
  log.info('\n📤 Sending Monthly Promotion Coupons Email...');
  log.info(`   To: ${TEST_EMAIL}`);
  log.info(`   Plan: ${testProUser.planName}`);
  log.info('   Coupon breakdown:');
  log.info('   - 2 Highlighted coupons');
  log.info('   - 1 Premium coupon');
  log.info('   - 0 Featured coupons');
  log.info('   Total: 3 coupons available');

  await sendMonthlyCouponEmail({
    email: testProUser.email,
    userName: testProUser.name,
    planName: testProUser.planName,
    totalCoupons: 3,
    newCoupons: 3,
    rolledOver: 0,
    breakdown: {
      highlighted: 2,
      premium: 1,
      featured: 0,
    },
  });
  log.info('   ✅ Monthly Promotion Coupons email sent!');
}

// =============================================================================
// Main Function
// =============================================================================

function showHelp() {
  log.info(`
📧 Test Email Sender
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Usage: npx ts-node src/scripts/sendTestEmails.ts [option]

Options:
  1, agent-coupons    Send Enterprise Agent Registration Coupons (5 codes)
  2, welcome          Send Enterprise Welcome/Thank You Email
  3, promo-coupons    Send Monthly Promotion Coupons Email
  all                 Send all emails
  help                Show this help message

Examples:
  npx ts-node src/scripts/sendTestEmails.ts 1
  npx ts-node src/scripts/sendTestEmails.ts welcome
  npx ts-node src/scripts/sendTestEmails.ts all
`);
}

async function main() {
  const arg = process.argv[2]?.toLowerCase() || 'all';

  log.info('📧 Test Email Sender');
  log.info(`📬 Target Email: ${TEST_EMAIL}`);
  log.info('─'.repeat(50));

  try {
    switch (arg) {
      case '1':
      case 'agent-coupons':
        await sendAgentCouponsEmail();
        break;

      case '2':
      case 'welcome':
        await sendWelcomeEmail();
        break;

      case '3':
      case 'promo-coupons':
        await sendPromoCouponsEmail();
        break;

      case 'all':
        await sendAgentCouponsEmail();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await sendWelcomeEmail();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await sendPromoCouponsEmail();
        break;

      case 'help':
      case '-h':
      case '--help':
        showHelp();
        return;

      default:
        log.info(`❌ Unknown option: ${arg}`);
        showHelp();
        return;
    }

    log.info('\n' + '═'.repeat(50));
    log.info('🎉 Email(s) sent successfully!');
    log.info(`📬 Check inbox at: ${TEST_EMAIL}`);
    log.info('═'.repeat(50));

  } catch (error) {
    log.error('\n❌ Error sending emails:', error);
    process.exit(1);
  }
}

// Run the script
main().catch((err) => log.error(err));

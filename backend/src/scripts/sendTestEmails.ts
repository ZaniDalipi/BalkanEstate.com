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
  console.log('\n📤 Sending Enterprise Agent Coupons Email...');
  console.log(`   To: ${TEST_EMAIL}`);
  console.log('   Contains 5 agent registration codes:');
  testAgentCoupons.forEach((coupon, i) => {
    console.log(`   ${i + 1}. ${coupon.code} (expires: ${coupon.expiresAt.toLocaleDateString()})`);
  });

  await sendAgentRegistrationCouponsEmail({
    email: testAgencyOwner.email,
    ownerName: testAgencyOwner.name,
    agencyName: testAgencyOwner.agencyName,
    coupons: testAgentCoupons,
  });
  console.log('   ✅ Agent Registration Coupons email sent!');
}

async function sendWelcomeEmail() {
  console.log('\n📤 Sending Enterprise Welcome Email...');
  console.log(`   To: ${TEST_EMAIL}`);
  console.log(`   Agency: ${testAgencyOwner.agencyName}`);

  await sendEnterpriseWelcomeEmail({
    email: testAgencyOwner.email,
    ownerName: testAgencyOwner.name,
    agencyName: testAgencyOwner.agencyName,
  });
  console.log('   ✅ Enterprise Welcome email sent!');
}

async function sendPromoCouponsEmail() {
  console.log('\n📤 Sending Monthly Promotion Coupons Email...');
  console.log(`   To: ${TEST_EMAIL}`);
  console.log(`   Plan: ${testProUser.planName}`);
  console.log('   Coupon breakdown:');
  console.log('   - 2 Highlighted coupons');
  console.log('   - 1 Premium coupon');
  console.log('   - 0 Featured coupons');
  console.log('   Total: 3 coupons available');

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
  console.log('   ✅ Monthly Promotion Coupons email sent!');
}

// =============================================================================
// Main Function
// =============================================================================

function showHelp() {
  console.log(`
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

  console.log('📧 Test Email Sender');
  console.log(`📬 Target Email: ${TEST_EMAIL}`);
  console.log('─'.repeat(50));

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
        console.log(`❌ Unknown option: ${arg}`);
        showHelp();
        return;
    }

    console.log('\n' + '═'.repeat(50));
    console.log('🎉 Email(s) sent successfully!');
    console.log(`📬 Check inbox at: ${TEST_EMAIL}`);
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('\n❌ Error sending emails:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

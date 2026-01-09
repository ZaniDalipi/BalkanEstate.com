/**
 * Send Test Emails Script
 * Run with: npx ts-node src/scripts/sendTestEmails.ts
 *
 * Sends actual test emails:
 * 1. Enterprise Agent Registration Coupons (5 codes)
 * 2. Enterprise Welcome/Thank You Email
 * 3. Monthly Promotion Coupons Email (Pro/Enterprise)
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
// Main Function
// =============================================================================

async function main() {
  console.log('📧 Starting Email Simulation Test');
  console.log(`📬 Target Email: ${TEST_EMAIL}`);
  console.log('─'.repeat(50));

  try {
    // 1. Send Enterprise Agent Registration Coupons Email
    console.log('\n📤 [1/3] Sending Enterprise Agent Coupons Email...');
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

    // Small delay between emails
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Send Enterprise Welcome/Thank You Email
    console.log('\n📤 [2/3] Sending Enterprise Welcome Email...');

    await sendEnterpriseWelcomeEmail({
      email: testAgencyOwner.email,
      ownerName: testAgencyOwner.name,
      agencyName: testAgencyOwner.agencyName,
    });
    console.log('   ✅ Enterprise Welcome email sent!');

    // Small delay between emails
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Send Monthly Promotion Coupons Email
    console.log('\n📤 [3/3] Sending Monthly Promotion Coupons Email...');
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

    console.log('\n' + '═'.repeat(50));
    console.log('🎉 All test emails sent successfully!');
    console.log(`📬 Check inbox at: ${TEST_EMAIL}`);
    console.log('═'.repeat(50));

    console.log('\n📋 Summary of emails sent:');
    console.log('   1. Enterprise Agent Coupons - 5 registration codes for team members');
    console.log('   2. Enterprise Welcome - Thank you & benefits overview');
    console.log('   3. Monthly Promotion Coupons - 3 coupons (2 highlighted + 1 premium)');

  } catch (error) {
    console.error('\n❌ Error sending emails:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

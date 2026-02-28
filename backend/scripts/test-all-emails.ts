/**
 * Test script to send all email types to a specific address
 *
 * Usage:
 *   cd backend && npx ts-node scripts/test-all-emails.ts zanoin@gmail.com
 *
 * Or test specific email type:
 *   cd backend && npx ts-node scripts/test-all-emails.ts zanoin@gmail.com verification
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
dotenv.config();

import emailService from '../src/services/emailService';
import { scriptLogger } from '../src/utils/logger';

const testEmail = process.argv[2];
const specificType = process.argv[3];

const log = scriptLogger.child('TestAllEmails');

if (!testEmail) {
  log.error('❌ Please provide an email address as argument');
  log.info('Usage: npx ts-node scripts/test-all-emails.ts your@email.com [type]');
  log.info('Types: verification, password-reset, welcome, alert, price-drop, inquiry, weekly-stats, message');
  process.exit(1);
}

log.info(`\n📧 Testing emails to: ${testEmail}\n`);

async function sendTestEmails() {
  const results: { type: string; success: boolean; error?: string }[] = [];

  // 1. Email Verification (noreply@)
  if (!specificType || specificType === 'verification') {
    try {
      log.info('📨 Sending: Email Verification (noreply@)...');
      await emailService.sendEmailVerification({
        email: testEmail,
        userName: 'Test User',
        verificationUrl: 'https://balkanestateai.com/verify-email?token=test-token-123',
      });
      results.push({ type: 'Email Verification', success: true });
      log.info('   ✅ Sent!\n');
    } catch (error: any) {
      results.push({ type: 'Email Verification', success: false, error: error.message });
      log.info(`   ❌ Failed: ${error.message}\n`);
    }
  }

  // 2. Password Reset (noreply@)
  if (!specificType || specificType === 'password-reset') {
    try {
      log.info('📨 Sending: Password Reset (noreply@)...');
      await emailService.sendPasswordResetEmail({
        email: testEmail,
        userName: 'Test User',
        resetUrl: 'https://balkanestateai.com/reset-password?token=test-token-456',
      });
      results.push({ type: 'Password Reset', success: true });
      log.info('   ✅ Sent!\n');
    } catch (error: any) {
      results.push({ type: 'Password Reset', success: false, error: error.message });
      log.info(`   ❌ Failed: ${error.message}\n`);
    }
  }

  // 3. Welcome Email (support@)
  if (!specificType || specificType === 'welcome') {
    try {
      log.info('📨 Sending: Welcome Email (support@)...');
      await emailService.sendWelcomeEmail({
        email: testEmail,
        userName: 'Test User',
      });
      results.push({ type: 'Welcome Email', success: true });
      log.info('   ✅ Sent!\n');
    } catch (error: any) {
      results.push({ type: 'Welcome Email', success: false, error: error.message });
      log.info(`   ❌ Failed: ${error.message}\n`);
    }
  }

  // 4. Property Alert (alerts@)
  if (!specificType || specificType === 'alert') {
    try {
      log.info('📨 Sending: Property Alert (alerts@)...');
      await emailService.sendPropertyAlert({
        recipientEmail: testEmail,
        recipientName: 'Test User',
        searchName: 'Apartments in Skopje',
        property: {
          id: 'test-property-123',
          title: 'Beautiful 3-Bedroom Apartment in City Center',
          address: '123 Main Street',
          city: 'Skopje',
          price: 125000,
          beds: 3,
          baths: 2,
          sqft: 95,
          imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600',
        },
      });
      results.push({ type: 'Property Alert', success: true });
      log.info('   ✅ Sent!\n');
    } catch (error: any) {
      results.push({ type: 'Property Alert', success: false, error: error.message });
      log.info(`   ❌ Failed: ${error.message}\n`);
    }
  }

  // 5. Price Drop Alert (alerts@)
  if (!specificType || specificType === 'price-drop') {
    try {
      log.info('📨 Sending: Price Drop Alert (alerts@)...');
      await emailService.sendPriceDropAlert({
        recipientEmail: testEmail,
        recipientName: 'Test User',
        property: {
          id: 'test-property-456',
          title: 'Luxury Villa with Pool',
          address: '456 Lake Road',
          city: 'Ohrid',
          previousPrice: 350000,
          newPrice: 299000,
          percentageDrop: 15,
          beds: 4,
          baths: 3,
          sqft: 250,
          imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600',
        },
      });
      results.push({ type: 'Price Drop Alert', success: true });
      log.info('   ✅ Sent!\n');
    } catch (error: any) {
      results.push({ type: 'Price Drop Alert', success: false, error: error.message });
      log.info(`   ❌ Failed: ${error.message}\n`);
    }
  }

  // 6. Agent Inquiry (inquiries@)
  if (!specificType || specificType === 'inquiry') {
    try {
      log.info('📨 Sending: Agent Inquiry (inquiries@)...');
      await emailService.sendAgentInquiry({
        agentEmail: testEmail,
        agentName: 'Test Agent',
        buyerName: 'John Smith',
        buyerEmail: 'john.smith@example.com',
        buyerPhone: '+389 70 123 456',
        message: 'Hi, I am very interested in this property. Could you please provide more information about the neighborhood and available viewing times? I am looking to move within the next 2 months.',
        propertyTitle: 'Beautiful 3-Bedroom Apartment in City Center',
        propertyId: 'test-property-123',
        location: 'Skopje, North Macedonia',
        inquiryType: 'property',
      });
      results.push({ type: 'Agent Inquiry (Property)', success: true });
      log.info('   ✅ Sent!\n');
    } catch (error: any) {
      results.push({ type: 'Agent Inquiry (Property)', success: false, error: error.message });
      log.info(`   ❌ Failed: ${error.message}\n`);
    }
  }

  // 7. New Message Notification (inquiries@)
  if (!specificType || specificType === 'message') {
    try {
      log.info('📨 Sending: New Message Notification (inquiries@)...');
      await emailService.sendNewMessageNotification({
        recipientEmail: testEmail,
        recipientName: 'Test User',
        senderName: 'Maria Johnson',
        messagePreview: 'Thank you for your interest! The property is still available and I would be happy to arrange a viewing...',
        propertyTitle: 'Cozy Studio Apartment',
        propertyAddress: '123 Main Street',
        propertyCity: 'Skopje',
        conversationUrl: 'https://balkanestateai.com/messages/test-conversation',
      });
      results.push({ type: 'New Message Notification', success: true });
      log.info('   ✅ Sent!\n');
    } catch (error: any) {
      results.push({ type: 'New Message Notification', success: false, error: error.message });
      log.info(`   ❌ Failed: ${error.message}\n`);
    }
  }

  // 8. Weekly Stats (support@)
  if (!specificType || specificType === 'weekly-stats') {
    try {
      log.info('📨 Sending: Weekly Stats (support@)...');
      await emailService.sendWeeklyStats({
        userName: 'Test User',
        email: testEmail,
        period: 'Dec 30, 2025 - Jan 6, 2026',
        totalViews: 1247,
        viewsChange: 15,
        totalInquiries: 23,
        inquiriesChange: 8,
        totalSaves: 45,
        savesChange: -3,
        activeListings: 5,
        propertiesSold: 2,
        totalSalesValue: 275000,
        topPerformingProperty: {
          title: 'Luxury Penthouse',
          address: '123 Main Street, Skopje',
          views: 342,
          inquiries: 8,
        },
      });
      results.push({ type: 'Weekly Stats', success: true });
      log.info('   ✅ Sent!\n');
    } catch (error: any) {
      results.push({ type: 'Weekly Stats', success: false, error: error.message });
      log.info(`   ❌ Failed: ${error.message}\n`);
    }
  }

  // Print summary
  log.info('═══════════════════════════════════════════');
  log.info('                  SUMMARY                  ');
  log.info('═══════════════════════════════════════════\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    log.info(`✅ Sent successfully (${successful.length}):`);
    successful.forEach(r => log.info(`   - ${r.type}`));
    log.info('');
  }

  if (failed.length > 0) {
    log.info(`❌ Failed (${failed.length}):`);
    failed.forEach(r => log.info(`   - ${r.type}: ${r.error}`));
    log.info('');
  }

  log.info(`📊 Total: ${successful.length}/${results.length} emails sent successfully\n`);

  if (failed.length > 0) {
    log.info('💡 Tip: Make sure RESEND_API_KEY is set in your .env.development file');
    log.info('   Get a free API key at: https://resend.com\n');
  }
}

sendTestEmails()
  .then(() => process.exit(0))
  .catch(error => {
    log.error('Fatal error:', error);
    process.exit(1);
  });

/**
 * Test script to verify email configuration
 * Run with: npx ts-node scripts/test-email.ts your@email.com
 */

import dotenv from 'dotenv';
dotenv.config();

import { sendNewMessageNotification } from '../src/services/emailService';
import { scriptLogger } from '../src/utils/logger';

const testEmail = process.argv[2];

const log = scriptLogger.child('TestEmail');

if (!testEmail) {
  log.error('Usage: npx ts-node scripts/test-email.ts your@email.com');
  process.exit(1);
}

async function main() {
  log.info('📧 Testing email configuration...\n');
  log.info('Provider:', process.env.RESEND_API_KEY ? 'Resend' : process.env.SMTP_USER ? 'SMTP' : 'None');
  log.info('Sending to:', testEmail);
  log.info('');

  try {
    await sendNewMessageNotification({
      recipientEmail: testEmail,
      recipientName: 'Test User',
      senderName: 'John Doe',
      messagePreview: 'Hi! I am interested in your property. Is it still available? I would like to schedule a viewing this weekend if possible.',
      propertyTitle: 'Beautiful Apartment in Zagreb',
      propertyAddress: 'Ilica 123',
      propertyCity: 'Zagreb',
      conversationUrl: 'https://balkanestate.com/inbox',
    });

    log.info('\n✅ Test email sent successfully!');
    log.info('Check your inbox (and spam folder) for the test email.');
  } catch (error) {
    log.error('\n❌ Failed to send test email:', error);
  }
}

main();

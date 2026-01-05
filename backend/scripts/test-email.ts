/**
 * Test script to verify email configuration
 * Run with: npx ts-node scripts/test-email.ts your@email.com
 */

import dotenv from 'dotenv';
dotenv.config();

import { sendNewMessageNotification } from '../src/services/emailService';

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('Usage: npx ts-node scripts/test-email.ts your@email.com');
  process.exit(1);
}

async function main() {
  console.log('📧 Testing email configuration...\n');
  console.log('Provider:', process.env.RESEND_API_KEY ? 'Resend' : process.env.SMTP_USER ? 'SMTP' : 'None');
  console.log('Sending to:', testEmail);
  console.log('');

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

    console.log('\n✅ Test email sent successfully!');
    console.log('Check your inbox (and spam folder) for the test email.');
  } catch (error) {
    console.error('\n❌ Failed to send test email:', error);
  }
}

main();

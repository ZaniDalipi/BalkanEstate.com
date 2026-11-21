/**
 * The email a customer gets after requesting a plan: the reference to quote,
 * the amount, and how to pay. Kept out of emailService.ts, which is already
 * thousands of lines; it reuses that service's layout and sending queue.
 */
import emailService, { sendEmail } from '../emailService';
import type { IPaymentOrder } from '../../models/PaymentOrder';
import type { PaymentInstructions } from '../../config/manualPayment';
import { formatEuros } from '../../utils/planPricing';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const row = (label: string, value: string): string =>
  `<tr><td style="padding:6px 16px 6px 0;color:#6b7280;white-space:nowrap" class="ec-text-muted">${escapeHtml(label)}</td>` +
  `<td style="padding:6px 0;color:#111827;font-weight:600" class="ec-text">${escapeHtml(value)}</td></tr>`;

/** The plain-text lines of the instructions, shared by the HTML and text versions. */
export function instructionLines(order: IPaymentOrder, instructions: PaymentInstructions): string[] {
  const lines = [
    `Plan: ${order.productName}`,
    `Amount: ${formatEuros(order.amountCents)}`,
    `Reference: ${order.reference}`,
  ];
  const bank = instructions.bankTransfer;
  if (bank) {
    lines.push(
      '',
      'Pay by bank transfer:',
      `Account holder: ${bank.accountHolder}`,
      `IBAN: ${bank.iban}`,
      ...(bank.bic ? [`BIC/SWIFT: ${bank.bic}`] : []),
      ...(bank.bankName ? [`Bank: ${bank.bankName}`] : []),
      `Payment description: ${order.reference}`
    );
  } else {
    lines.push('', 'Our team will contact you within one business day with how to pay.');
  }
  lines.push('', `Questions? Write to ${instructions.contactEmail} and mention ${order.reference}.`);
  return lines;
}

export async function sendPaymentInstructionsEmail(
  order: IPaymentOrder,
  instructions: PaymentInstructions,
  frontendUrl: string = process.env.FRONTEND_URL || 'https://balkanestateai.com'
): Promise<void> {
  const bank = instructions.bankTransfer;
  const howToPay = bank
    ? `<h3 style="margin:24px 0 8px" class="ec-text">Pay by bank transfer</h3>
       <table style="border-collapse:collapse;font-size:14px">
         ${row('Account holder', bank.accountHolder)}
         ${row('IBAN', bank.iban)}
         ${bank.bic ? row('BIC/SWIFT', bank.bic) : ''}
         ${bank.bankName ? row('Bank', bank.bankName) : ''}
         ${row('Payment description', order.reference)}
       </table>
       <p class="ec-text">Please put the reference <strong>${escapeHtml(order.reference)}</strong> in the payment description so we can match your payment.</p>`
    : `<p class="ec-text">Our team will contact you within one business day with how to pay.</p>`;

  const html = emailService.wrapEmailHtml(
    `<div style="max-width:600px;margin:0 auto;padding:20px;background-color:#ffffff" class="ec-card">
       <h1 style="color:#2563eb" class="ec-text">Your plan request</h1>
       <p class="ec-text">Hi ${escapeHtml(order.userName || 'there')},</p>
       <p class="ec-text">Thank you for choosing ${escapeHtml(order.productName)}. Here is everything you need to pay for it.</p>
       <table style="border-collapse:collapse;font-size:14px;background:#f3f4f6;border-radius:8px;padding:12px" class="ec-highlight">
         ${row('Plan', order.productName)}
         ${row('Amount', formatEuros(order.amountCents))}
         ${order.discountCode ? row('Code', order.discountCode) : ''}
         ${row('Reference', order.reference)}
       </table>
       ${howToPay}
       <p class="ec-text">Your plan starts as soon as we confirm your payment. If you already have this plan, the new period is added to the end of the current one.</p>
       <p class="ec-text-muted">Questions? Write to <a href="mailto:${escapeHtml(instructions.contactEmail)}">${escapeHtml(instructions.contactEmail)}</a> and mention ${escapeHtml(order.reference)}. You can see your requests in <a href="${escapeHtml(frontendUrl)}/account?tab=subscription">your account</a>.</p>
     </div>`,
    `${order.productName}: ${formatEuros(order.amountCents)}, reference ${order.reference}`
  );

  await sendEmail({
    to: order.userEmail,
    subject: `Your ${order.productName} request – reference ${order.reference}`,
    html,
    text: instructionLines(order, instructions).join('\n'),
  });
}

/**
 * How a customer pays for a plan while there is no online payment: the team
 * contact, and the bank account for a transfer when one is configured.
 *
 * Set on the server (backend .env):
 *   PAYMENT_CONTACT_EMAIL          who customers write to (default sales@balkanestateai.com)
 *   PAYMENT_BANK_ACCOUNT_HOLDER    \
 *   PAYMENT_BANK_IBAN               } both needed to show transfer details
 *   PAYMENT_BANK_BIC               optional
 *   PAYMENT_BANK_NAME              optional
 * Without the account, customers are told the team will contact them with how to pay.
 */

export interface BankTransferDetails {
  accountHolder: string;
  iban: string;
  bic?: string;
  bankName?: string;
}

export interface PaymentInstructions {
  contactEmail: string;
  bankTransfer: BankTransferDetails | null;
}

export const DEFAULT_PAYMENT_CONTACT_EMAIL = 'sales@balkanestateai.com';

const clean = (value: string | undefined): string | undefined => value?.trim() || undefined;

export function paymentInstructionsFrom(env: Record<string, string | undefined>): PaymentInstructions {
  const accountHolder = clean(env.PAYMENT_BANK_ACCOUNT_HOLDER);
  const iban = clean(env.PAYMENT_BANK_IBAN)?.replace(/\s+/g, ' ');
  return {
    contactEmail: clean(env.PAYMENT_CONTACT_EMAIL) ?? DEFAULT_PAYMENT_CONTACT_EMAIL,
    bankTransfer:
      accountHolder && iban
        ? { accountHolder, iban, bic: clean(env.PAYMENT_BANK_BIC), bankName: clean(env.PAYMENT_BANK_NAME) }
        : null,
  };
}

export const paymentInstructions = (): PaymentInstructions => paymentInstructionsFrom(process.env);

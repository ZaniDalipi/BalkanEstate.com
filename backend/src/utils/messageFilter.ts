/**
 * Security utilities for filtering sensitive information from messages
 */

// Common credit card patterns (Visa, MasterCard, Amex, Discover, etc.)
const CREDIT_CARD_PATTERNS = [
  // Visa: 4xxx-xxxx-xxxx-xxxx (13-16 digits)
  /\b4[0-9]{3}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{1,4}\b/g,
  // MasterCard: 5xxx-xxxx-xxxx-xxxx (16 digits)
  /\b5[1-5][0-9]{2}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}\b/g,
  // American Express: 3xxx-xxxxxx-xxxxx (15 digits)
  /\b3[47][0-9]{2}[\s\-]?[0-9]{6}[\s\-]?[0-9]{5}\b/g,
  // Discover: 6xxx-xxxx-xxxx-xxxx (16 digits)
  /\b6(?:011|5[0-9]{2})[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}\b/g,
  // Generic pattern for any sequence of 13-16 digits (with optional spaces or dashes)
  /\b[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{1,4}\b/g,
];

// CVV pattern (3-4 digits)
const CVV_PATTERN = /\bCVV[\s:]?[0-9]{3,4}\b/gi;

// Expiration date patterns (MM/YY, MM/YYYY)
const EXPIRY_PATTERN = /\b(0[1-9]|1[0-2])[\s\/\-](20)?[0-9]{2}\b/g;

// Social Security Number pattern (XXX-XX-XXXX)
const SSN_PATTERN = /\b[0-9]{3}[\s\-][0-9]{2}[\s\-][0-9]{4}\b/g;

// Bank account patterns
const BANK_ACCOUNT_PATTERN = /\b(?:account|acct)[\s#:]*[0-9]{8,17}\b/gi;

/**
 * Luhn algorithm to validate credit card numbers
 * This reduces false positives by checking if the number is a valid card
 */
function isValidCreditCard(cardNumber: string): boolean {
  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s\-]/g, '');

  // Must be 13-16 digits
  if (!/^[0-9]{13,16}$/.test(cleaned)) {
    return false;
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Detects if a message contains credit card information
 */
export function containsCreditCard(text: string): boolean {
  // Check all credit card patterns
  for (const pattern of CREDIT_CARD_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      // Validate with Luhn algorithm to reduce false positives
      for (const match of matches) {
        if (isValidCreditCard(match)) {
          return true;
        }
      }
    }
  }

  // Check for CVV
  if (CVV_PATTERN.test(text)) {
    return true;
  }

  return false;
}

/**
 * Detects if a message contains other sensitive financial information
 */
export function containsSensitiveInfo(text: string): boolean {
  return (
    containsCreditCard(text) ||
    SSN_PATTERN.test(text) ||
    BANK_ACCOUNT_PATTERN.test(text)
  );
}

/**
 * Filters credit card numbers from text by replacing them with [REDACTED]
 */
export function filterCreditCards(text: string): string {
  let filtered = text;

  // Filter credit card numbers
  for (const pattern of CREDIT_CARD_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        if (isValidCreditCard(match)) {
          // Keep first 4 and last 4 digits, mask the rest
          const cleaned = match.replace(/[\s\-]/g, '');
          const masked = `${cleaned.slice(0, 4)}-****-****-${cleaned.slice(-4)}`;
          filtered = filtered.replace(match, `[CARD: ${masked}]`);
        }
      }
    }
  }

  // Filter CVV
  filtered = filtered.replace(CVV_PATTERN, '[CVV: REDACTED]');

  // Filter expiry dates near card numbers
  filtered = filtered.replace(EXPIRY_PATTERN, '[EXPIRY: REDACTED]');

  // Filter SSN
  filtered = filtered.replace(SSN_PATTERN, '[SSN: REDACTED]');

  // Filter bank accounts
  filtered = filtered.replace(BANK_ACCOUNT_PATTERN, '[ACCOUNT: REDACTED]');

  return filtered;
}

/**
 * Validates and sanitizes a message before saving
 * Returns sanitized message and warning flag
 */
export function sanitizeMessage(text: string): {
  sanitized: string;
  hadSensitiveInfo: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  let sanitized = text;

  // Check for credit cards
  if (containsCreditCard(text)) {
    warnings.push('Credit card information detected and redacted for your security');
    sanitized = filterCreditCards(sanitized);
  }

  // Check for SSN
  if (SSN_PATTERN.test(text)) {
    warnings.push('Social Security Number detected and redacted');
    sanitized = sanitized.replace(SSN_PATTERN, '[SSN: REDACTED]');
  }

  // Check for bank accounts
  if (BANK_ACCOUNT_PATTERN.test(text)) {
    warnings.push('Bank account information detected and redacted');
    sanitized = sanitized.replace(BANK_ACCOUNT_PATTERN, '[ACCOUNT: REDACTED]');
  }

  return {
    sanitized,
    hadSensitiveInfo: warnings.length > 0,
    warnings,
  };
}

/**
 * Security warning message to display to users
 */
export const SECURITY_WARNING = `
⚠️ SECURITY NOTICE:
For your protection, please DO NOT share:
• Credit card numbers
• CVV codes
• Bank account details
• Social Security Numbers
• Passwords or PINs

Any sensitive information will be automatically redacted.
`.trim();

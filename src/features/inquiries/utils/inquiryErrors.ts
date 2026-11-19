/**
 * Turns an inquiry API error into a translated message, and says which field
 * it belongs to so the form can show it next to that field. The server sends
 * a machine-readable `code` (see backend/src/controllers/inquiryAdmission.ts);
 * anything unknown falls back to the server's own message or a generic text.
 */
export type InquiryErrorField = 'buyerName' | 'buyerEmail' | 'buyerPhone' | 'message';

export interface InquiryErrorView {
  field?: InquiryErrorField;
  message: string;
}

type Translate = (key: string, fallback: string) => string;

const CODES: Record<string, { key: string; fallback: string; field?: InquiryErrorField }> = {
  invalid_name: { key: 'common:inquiryErrors.invalidName', fallback: 'Please enter your name (2–100 characters).', field: 'buyerName' },
  invalid_email: { key: 'common:inquiryErrors.invalidEmail', fallback: 'Please enter a valid email address.', field: 'buyerEmail' },
  invalid_phone: { key: 'common:inquiryErrors.invalidPhone', fallback: 'This phone number is not valid. Check the country code and number, or leave it empty.', field: 'buyerPhone' },
  phone_mismatch: { key: 'common:inquiryErrors.phoneMismatch', fallback: 'Please use the same phone number as in your earlier inquiries.', field: 'buyerPhone' },
  invalid_message: { key: 'common:inquiryErrors.invalidMessage', fallback: 'Please write a message (up to 2000 characters).', field: 'message' },
  duplicate_inquiry: { key: 'common:inquiryErrors.duplicate', fallback: 'You already sent this inquiry. The agent will reply to you by email.' },
  sender_limit: { key: 'common:inquiryErrors.tooMany', fallback: 'You have sent many inquiries recently. Please try again in an hour.' },
};

const codeOf = (err: unknown): string | null => {
  if (!err || typeof err !== 'object') return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
};

export const describeInquiryError = (err: unknown, t: Translate, fallback: string): InquiryErrorView => {
  const known = CODES[codeOf(err) ?? ''];
  if (known) return { field: known.field, message: t(known.key, known.fallback) };
  if (err instanceof Error && err.message) return { message: err.message };
  return { message: fallback };
};

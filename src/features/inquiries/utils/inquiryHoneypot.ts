/**
 * Hidden "honeypot" field on the public inquiry forms. People never see or
 * fill it; form-filling bots do, and the server then drops the inquiry while
 * answering with a normal success. The name must match HONEYPOT_FIELD in
 * backend/src/services/inquiries/inquiryInput.ts and is chosen so browsers
 * don't autofill it.
 */
export const HONEYPOT_FIELD = 'confirm_details';

/** The honeypot's value from a submitted form ('' when untouched). */
export const readHoneypot = (form: HTMLFormElement): string => {
  const input = form.elements.namedItem(HONEYPOT_FIELD);
  return input instanceof HTMLInputElement ? input.value : '';
};

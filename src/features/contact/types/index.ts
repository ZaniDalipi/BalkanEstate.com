/**
 * Contact Feature Types
 */

export interface ContactFormData {
  name: string;
  email: string;
  countryCode: string;
  phone: string;
  subject: string;
  message: string;
}

export interface ContactFormErrors {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

export type ContactSubject =
  | 'general'
  | 'buying'
  | 'selling'
  | 'agency'
  | 'support'
  | 'partnership';

export interface ContactSubmitResponse {
  message: string;
  inquiryId: string;
}

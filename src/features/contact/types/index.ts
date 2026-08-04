/**
 * Contact Feature Types
 */

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  // Advertising requests only:
  adPage?: string;
  adPlacement?: string;
  adImageUrl?: string;
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
  | 'partnership'
  | 'advertising';

export interface ContactSubmitResponse {
  message: string;
  inquiryId: string;
}

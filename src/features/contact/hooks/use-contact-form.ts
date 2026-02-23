/**
 * useContactForm Hook
 * Manages contact form state, validation, and submission
 */

import { useState, useCallback } from 'react';
import { validateEmail, validateName, validatePhone, sanitizeText } from '@/src/shared/utils/validation';
import type { ContactFormData, ContactFormErrors } from '../types';

const INITIAL_FORM_DATA: ContactFormData = {
  name: '',
  email: '',
  countryCode: '+383',
  phone: '',
  subject: 'general',
  message: '',
};

// Phone number format patterns per Balkan country code (digit group sizes)
const PHONE_FORMAT_PATTERNS: Record<string, number[]> = {
  '+383': [2, 3, 4],    // Kosovo: 44 123 4567
  '+355': [2, 3, 4],    // Albania: 69 123 4567
  '+381': [2, 3, 4],    // Serbia: 63 123 4567
  '+389': [2, 3, 3],    // N. Macedonia: 70 123 456
  '+387': [2, 3, 3],    // Bosnia: 61 123 456
  '+382': [2, 3, 3],    // Montenegro: 67 123 456
  '+385': [2, 3, 4],    // Croatia: 91 123 4567
  '+386': [2, 3, 2, 2], // Slovenia: 31 123 45 67
  '+359': [2, 3, 4],    // Bulgaria: 88 123 4567
  '+40':  [3, 3, 3],    // Romania: 721 123 456
  '+30':  [3, 3, 4],    // Greece: 694 123 4567
};

function formatPhoneNumber(countryCode: string, digits: string): string {
  const clean = digits.replace(/\D/g, '');
  const pattern = PHONE_FORMAT_PATTERNS[countryCode] || [3, 3, 4];
  const parts: string[] = [];
  let pos = 0;
  for (const groupSize of pattern) {
    if (pos >= clean.length) break;
    parts.push(clean.slice(pos, pos + groupSize));
    pos += groupSize;
  }
  if (pos < clean.length && parts.length > 0) {
    parts[parts.length - 1] += clean.slice(pos);
  }
  return parts.join(' ');
}

const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 2000;

export function useContactForm() {
  const [formData, setFormData] = useState<ContactFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;

      if (name === 'phone') {
        // Format phone number according to selected country
        setFormData((prev) => ({
          ...prev,
          phone: formatPhoneNumber(prev.countryCode, value),
        }));
      } else if (name === 'countryCode') {
        // When country changes, reformat the existing phone number
        setFormData((prev) => ({
          ...prev,
          countryCode: value,
          phone: prev.phone ? formatPhoneNumber(value, prev.phone) : '',
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
      setErrors((prev) => ({ ...prev, [name]: undefined }));
      setSubmitError(null);
    },
    []
  );

  const validate = useCallback((): boolean => {
    const newErrors: ContactFormErrors = {};

    const nameResult = validateName(formData.name.trim());
    if (!nameResult.isValid) {
      newErrors.name = nameResult.error;
    }

    const emailResult = validateEmail(formData.email.trim());
    if (!emailResult.isValid) {
      newErrors.email = emailResult.error;
    }

    if (formData.phone.trim()) {
      const phoneResult = validatePhone(formData.phone.trim());
      if (!phoneResult.isValid) {
        newErrors.phone = phoneResult.error;
      }
    }

    if (!formData.subject) {
      newErrors.subject = 'Please select a subject';
    }

    const trimmedMessage = formData.message.trim();
    if (!trimmedMessage) {
      newErrors.message = 'Message is required';
    } else if (trimmedMessage.length < MESSAGE_MIN_LENGTH) {
      newErrors.message = `Message must be at least ${MESSAGE_MIN_LENGTH} characters`;
    } else if (trimmedMessage.length > MESSAGE_MAX_LENGTH) {
      newErrors.message = `Message cannot exceed ${MESSAGE_MAX_LENGTH} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const sanitizeFormData = useCallback(
    (): ContactFormData => ({
      name: sanitizeText(formData.name.trim()),
      email: formData.email.trim().toLowerCase(),
      countryCode: formData.countryCode,
      phone: formData.phone.trim()
        ? `${formData.countryCode} ${formData.phone.trim()}`
        : '',
      subject: formData.subject,
      message: sanitizeText(formData.message.trim()),
    }),
    [formData]
  );

  const handleSubmit = useCallback(
    async (
      submitFn: (data: ContactFormData) => Promise<void>
    ) => {
      if (!validate()) return;

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const sanitized = sanitizeFormData();
        await submitFn(sanitized);
        setIsSuccess(true);
        setFormData(INITIAL_FORM_DATA);
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : 'Failed to send message. Please try again.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, sanitizeFormData]
  );

  const reset = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setIsSubmitting(false);
    setIsSuccess(false);
    setSubmitError(null);
  }, []);

  return {
    formData,
    errors,
    isSubmitting,
    isSuccess,
    submitError,
    handleChange,
    handleSubmit,
    reset,
  };
}

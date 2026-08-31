/**
 * useContactForm Hook
 * Manages contact form state, validation, and submission
 */

import { useState, useCallback } from 'react';
import { validateEmail, validateName, sanitizeText } from '@/src/shared/utils/validation';
import { validateFullPhone } from '@/src/shared/components/ui/PhoneInput';
import type { ContactFormData, ContactFormErrors } from '../types';

const INITIAL_FORM_DATA: ContactFormData = {
  name: '',
  email: '',
  phone: '',
  subject: 'general',
  message: '',
};

const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 2000;

export function useContactForm(overrides?: Partial<ContactFormData>) {
  const [formData, setFormData] = useState<ContactFormData>({ ...INITIAL_FORM_DATA, ...overrides });
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => ({ ...prev, [name]: undefined }));
      setSubmitError(null);
    },
    []
  );

  const handlePhoneChange = useCallback((fullPhone: string) => {
    setFormData((prev) => ({ ...prev, phone: fullPhone }));
    setErrors((prev) => ({ ...prev, phone: undefined }));
    setSubmitError(null);
  }, []);

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

    if (formData.phone) {
      const phoneErr = validateFullPhone(formData.phone, false);
      if (phoneErr) newErrors.phone = phoneErr;
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
      phone: formData.phone.trim(),
      subject: formData.subject,
      message: sanitizeText(formData.message.trim()),
      adPage: formData.adPage,
      adPlacement: formData.adPlacement,
      adImageUrl: formData.adImageUrl,
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

  const setField = useCallback(
    (name: keyof ContactFormData, value: string | undefined) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  return {
    formData,
    errors,
    isSubmitting,
    isSuccess,
    submitError,
    handleChange,
    handlePhoneChange,
    handleSubmit,
    setField,
    reset,
  };
}

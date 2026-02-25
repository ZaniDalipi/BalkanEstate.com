import { useState, useCallback } from 'react';
import type { PropertyRequestData } from '../api/propertyRequests';

export interface PropertyRequestFormData {
  name: string;
  email: string;
  phone: string;
  telegramUsername: string;
  listingType: 'sale' | 'rent';
  propertyType: string;
  country: string;
  city: string;
  location: string;
  minPrice: string;
  maxPrice: string;
  minBeds: string;
  additionalNotes: string;
}

export interface PropertyRequestFormErrors {
  name?: string;
  email?: string;
  listingType?: string;
  minPrice?: string;
  maxPrice?: string;
  additionalNotes?: string;
}

const INITIAL_FORM_DATA: PropertyRequestFormData = {
  name: '',
  email: '',
  phone: '',
  telegramUsername: '',
  listingType: 'sale',
  propertyType: 'any',
  country: '',
  city: '',
  location: '',
  minPrice: '',
  maxPrice: '',
  minBeds: '',
  additionalNotes: '',
};

export function usePropertyRequestForm() {
  const [formData, setFormData] = useState<PropertyRequestFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<PropertyRequestFormErrors>({});
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

  const validate = useCallback((): boolean => {
    const newErrors: PropertyRequestFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Invalid email format';
      }
    }

    if (formData.minPrice && formData.maxPrice) {
      if (Number(formData.minPrice) > Number(formData.maxPrice)) {
        newErrors.maxPrice = 'Max price must be greater than min price';
      }
    }

    if (formData.additionalNotes.trim().length > 2000) {
      newErrors.additionalNotes = 'Notes cannot exceed 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const toRequestData = useCallback((): PropertyRequestData => {
    return {
      name: formData.name.trim(),
      email: formData.email.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      telegramUsername: formData.telegramUsername.trim() || undefined,
      listingType: formData.listingType,
      propertyType: formData.propertyType || undefined,
      country: formData.country.trim() || undefined,
      city: formData.city.trim() || undefined,
      location: formData.location.trim() || undefined,
      minPrice: formData.minPrice ? Number(formData.minPrice) : undefined,
      maxPrice: formData.maxPrice ? Number(formData.maxPrice) : undefined,
      minBeds: formData.minBeds ? Number(formData.minBeds) : undefined,
      additionalNotes: formData.additionalNotes.trim() || undefined,
    };
  }, [formData]);

  const handleSubmit = useCallback(
    async (submitFn: (data: PropertyRequestData) => Promise<void>) => {
      if (!validate()) return;

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const data = toRequestData();
        await submitFn(data);
        setIsSuccess(true);
        setFormData(INITIAL_FORM_DATA);
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : 'Failed to submit request. Please try again.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, toRequestData]
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

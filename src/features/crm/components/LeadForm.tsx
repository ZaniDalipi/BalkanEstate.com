import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateEmail, validatePhone, validateName, validatePrice } from '@/src/shared/utils/validation';
import type { CreateLeadInput, UpdateLeadInput, Lead, LeadStage, LeadSource } from '../types';
import { PIPELINE_STAGES, LEAD_SOURCES } from '../types';

interface LeadFormProps {
  initialValues?: Partial<Lead>;
  onSubmit: (data: CreateLeadInput | UpdateLeadInput) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  budget?: string;
}

export function LeadForm({ initialValues, onSubmit, isLoading, submitLabel }: LeadFormProps) {
  const { t } = useTranslation('crm');

  const [form, setForm] = useState({
    name: initialValues?.name ?? '',
    email: initialValues?.email ?? '',
    phone: initialValues?.phone ?? '',
    stage: initialValues?.stage ?? ('new' as LeadStage),
    source: initialValues?.source ?? ('other' as LeadSource),
    budget: initialValues?.budget !== undefined ? String(initialValues.budget) : '',
    preferredLocation: initialValues?.preferredLocation ?? '',
    preferredPropertyType: initialValues?.preferredPropertyType ?? '',
    notes: initialValues?.notes ?? '',
    nextAction: initialValues?.nextAction ?? '',
    nextActionDate: initialValues?.nextActionDate
      ? initialValues.nextActionDate.slice(0, 10)
      : '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};

    const nameResult = validateName(form.name);
    if (!nameResult.isValid) next.name = nameResult.error;

    const emailResult = validateEmail(form.email);
    if (!emailResult.isValid) next.email = emailResult.error;

    if (form.phone) {
      const phoneResult = validatePhone(form.phone);
      if (!phoneResult.isValid) next.phone = phoneResult.error;
    }

    if (form.budget) {
      const priceResult = validatePrice(Number(form.budget));
      if (!priceResult.isValid) next.budget = priceResult.error;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: CreateLeadInput = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || undefined,
      stage: form.stage,
      source: form.source,
      budget: form.budget ? Number(form.budget) : undefined,
      preferredLocation: form.preferredLocation.trim() || undefined,
      preferredPropertyType: form.preferredPropertyType.trim() || undefined,
      notes: form.notes.trim() || undefined,
      nextAction: form.nextAction.trim() || undefined,
      nextActionDate: form.nextActionDate || undefined,
    };
    onSubmit(payload);
  };

  const inputClass = (err?: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
      err
        ? 'border-red-400 focus:ring-red-300'
        : 'border-gray-200 focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('lead.name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={set('name')}
          maxLength={150}
          className={inputClass(errors.name)}
          placeholder={t('lead.namePlaceholder')}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('lead.email')} <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={form.email}
          onChange={set('email')}
          maxLength={254}
          className={inputClass(errors.email)}
          placeholder="client@example.com"
        />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('lead.phone')}
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={set('phone')}
          maxLength={20}
          className={inputClass(errors.phone)}
          placeholder="+355 69 123 4567"
        />
        {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
      </div>

      {/* Stage + Source */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('lead.stage')}
          </label>
          <select value={form.stage} onChange={set('stage')} className={inputClass()}>
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {t(`stage.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('lead.source')}
          </label>
          <select value={form.source} onChange={set('source')} className={inputClass()}>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {t(`source.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('lead.budget')} (€)
        </label>
        <input
          type="number"
          value={form.budget}
          onChange={set('budget')}
          min={0}
          className={inputClass(errors.budget)}
          placeholder="150000"
        />
        {errors.budget && <p className="mt-1 text-xs text-red-500">{errors.budget}</p>}
      </div>

      {/* Location + Property type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('lead.preferredLocation')}
          </label>
          <input
            type="text"
            value={form.preferredLocation}
            onChange={set('preferredLocation')}
            className={inputClass()}
            placeholder="Tirana, Durrës..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('lead.preferredPropertyType')}
          </label>
          <input
            type="text"
            value={form.preferredPropertyType}
            onChange={set('preferredPropertyType')}
            className={inputClass()}
            placeholder={t('lead.propertyTypePlaceholder')}
          />
        </div>
      </div>

      {/* Next action */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('lead.nextAction')}
          </label>
          <input
            type="text"
            value={form.nextAction}
            onChange={set('nextAction')}
            maxLength={500}
            className={inputClass()}
            placeholder={t('lead.nextActionPlaceholder')}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('lead.nextActionDate')}
          </label>
          <input
            type="date"
            value={form.nextActionDate}
            onChange={set('nextActionDate')}
            className={inputClass()}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('lead.notes')}
        </label>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          rows={3}
          maxLength={5000}
          className={inputClass()}
          placeholder={t('lead.notesPlaceholder')}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? t('common.saving') : (submitLabel ?? t('lead.save'))}
      </button>
    </form>
  );
}

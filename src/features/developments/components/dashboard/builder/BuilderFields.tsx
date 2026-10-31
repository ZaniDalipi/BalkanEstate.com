import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/src/shared/components/ui/Input';
import { BUILDER_SOCIAL_LABELS, BUILDER_SOCIAL_NETWORKS } from '../../../types';
import { BUILDER_LIMITS, type BuilderField, type BuilderForm } from '../../../validation/builderValidation';
import type { BuilderMessages } from './useBuilderForm';

interface BuilderFieldsProps {
  form: BuilderForm;
  set: (field: BuilderField, value: string) => void;
  errors: BuilderMessages;
  disabled: boolean;
}

/** The builder's text fields; each shows its own error under it (role="alert"). */
export const BuilderFields: React.FC<BuilderFieldsProps> = ({ form, set, errors, disabled }) => {
  const { t } = useTranslation('developments');
  const aboutId = React.useId();
  const L = BUILDER_LIMITS;
  const field = (key: Exclude<BuilderField, `socials.${string}` | 'about'>, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Input label={label} value={form[key]} onChange={(e) => set(key, e.target.value)} error={errors[key]} disabled={disabled} {...extra} />
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {field('name', t('builder.name', 'Company name'), { maxLength: L.name, required: true, autoComplete: 'organization' })}
        {field('tagline', t('builder.tagline', 'Tagline'), { maxLength: L.tagline, placeholder: t('builder.taglinePlaceholder', 'e.g. Building homes in Skopje since 2004') })}
      </div>
      <div>
        <label htmlFor={aboutId} className="mb-1.5 block text-sm font-medium text-gray-700">{t('builder.about', 'About the company')}</label>
        <textarea
          id={aboutId}
          rows={5}
          value={form.about}
          maxLength={L.about}
          onChange={(e) => set('about', e.target.value)}
          disabled={disabled}
          aria-invalid={errors.about ? 'true' : undefined}
          aria-describedby={errors.about ? `${aboutId}-err` : undefined}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50 aria-[invalid=true]:border-red-400"
        />
        {errors.about && <p id={`${aboutId}-err`} role="alert" className="mt-1.5 text-sm text-red-600">{errors.about}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {field('foundedYear', t('builder.foundedYear', 'Founded (year)'), { inputMode: 'numeric', placeholder: '2004' })}
        {field('completedProjects', t('builder.completedProjects', 'Completed projects'), { inputMode: 'numeric', placeholder: '18' })}
        {field('licenseNumber', t('builder.licenseNumber', 'Licence / registration no.'), { maxLength: L.licenseNumber })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('website', t('builder.website', 'Website'), { type: 'url', inputMode: 'url', maxLength: L.website, placeholder: 'https://', autoComplete: 'url' })}
        {field('email', t('builder.email', 'Email'), { type: 'email', inputMode: 'email', maxLength: L.email, autoComplete: 'email' })}
        {field('phone', t('builder.phone', 'Phone'), { type: 'tel', inputMode: 'tel', maxLength: L.phone, placeholder: '+389 …', autoComplete: 'tel' })}
        {field('address', t('builder.address', 'Office address'), { maxLength: L.address, autoComplete: 'street-address' })}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-700">{t('builder.socials', 'Social media')}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {BUILDER_SOCIAL_NETWORKS.map((n) => (
            <Input
              key={n}
              label={BUILDER_SOCIAL_LABELS[n]}
              type="url"
              inputMode="url"
              placeholder="https://"
              maxLength={L.social}
              value={form.socials[n]}
              onChange={(e) => set(`socials.${n}`, e.target.value)}
              error={errors[`socials.${n}`]}
              disabled={disabled}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
};

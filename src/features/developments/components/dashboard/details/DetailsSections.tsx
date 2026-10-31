import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/src/shared/components/ui/Input';
import PhoneInput from '@/src/shared/components/ui/PhoneInput';
import { TextArea } from './TextArea';
import { TimelineField } from './TimelineField';
import { dialCodeForCountry } from './dialCode';
import { FormSelect } from '../../shared/FormSelect';
import { DEVELOPMENT_CATEGORIES, DEVELOPMENT_CONSTRUCTION_STATUSES } from '../../../types';
import type { DetailsErrors } from '../../../validation/developmentValidation';
import type { DetailsDraft } from './detailsDraft';

export interface SectionProps {
  draft: DetailsDraft;
  set: (patch: Partial<DetailsDraft>) => void;
  /** Translated messages per field. */
  errors: DetailsErrors;
  disabled: boolean;
}

export const Fieldset: React.FC<{
  legend: string;
  children: React.ReactNode;
}> = ({ legend, children }) => (
  <fieldset className="space-y-4 border-t border-slate-200 pt-5 first:border-t-0 first:pt-0">
    <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{legend}</legend>
    {children}
  </fieldset>
);

/** Name, type, construction stage, completion date, description and website. */
export const AboutSection: React.FC<SectionProps> = ({ draft, set, errors, disabled }) => {
  const { t } = useTranslation('developments');
  return (
    <Fieldset legend={t('details.about', 'About the residence')}>
      <Input
        label={t('wizard.name')}
        value={draft.name}
        onChange={(e) => set({ name: e.target.value })}
        error={errors.name}
        maxLength={200}
        disabled={disabled}
        required
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormSelect
          label={t('wizard.category')}
          options={DEVELOPMENT_CATEGORIES.map((c) => ({
            value: c,
            label: t(`category.${c}`),
          }))}
          value={draft.category}
          onChange={(e) => set({ category: e.target.value })}
          error={errors.category}
          disabled={disabled}
          required
        />
        <FormSelect
          label={t('wizard.constructionStatus')}
          options={DEVELOPMENT_CONSTRUCTION_STATUSES.map((s) => ({
            value: s,
            label: t(`construction.${s}`),
          }))}
          value={draft.constructionStatus}
          onChange={(e) => set({ constructionStatus: e.target.value })}
          disabled={disabled}
        />
        <TimelineField
          constructionStatus={draft.constructionStatus}
          expectedCompletionDate={draft.expectedCompletionDate}
          yearBuilt={draft.yearBuilt}
          onChange={set}
          error={errors.yearBuilt}
          disabled={disabled}
        />
      </div>
      <TextArea
        label={t('details.description', 'Description')}
        value={draft.description}
        onChange={(description) => set({ description })}
        disabled={disabled}
      />
      <Input
        label={t('wizard.website')}
        placeholder="https://"
        value={draft.website}
        onChange={(e) => set({ website: e.target.value })}
        error={errors.website}
        inputMode="url"
        disabled={disabled}
      />
    </Fieldset>
  );
};

/** Who buyers reach about this residence. */
export const ContactSection: React.FC<SectionProps> = ({ draft, set, errors, disabled }) => {
  const { t } = useTranslation('developments');
  const phoneId = React.useId();
  return (
    <Fieldset legend={t('details.contact', 'Sales contact')}>
      <p className="text-sm text-slate-600">
        {t('details.contactHelper', 'Who handles sales questions about this residence. All fields are optional.')}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={t('details.contactName', 'Name')}
          value={draft.contactName}
          onChange={(e) => set({ contactName: e.target.value })}
          maxLength={120}
          disabled={disabled}
        />
        <Input
          type="email"
          label={t('details.contactEmail', 'Email')}
          value={draft.contactEmail}
          onChange={(e) => set({ contactEmail: e.target.value })}
          error={errors.contactEmail}
          disabled={disabled}
        />
        <div>
          <label htmlFor={phoneId} className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('details.contactPhone', 'Phone')}
          </label>
          <PhoneInput
            id={phoneId}
            value={draft.contactPhone}
            onChange={(contactPhone) => set({ contactPhone })}
            defaultCountryCode={dialCodeForCountry(draft.country)}
            error={errors.contactPhone}
            disabled={disabled}
          />
        </div>
      </div>
    </Fieldset>
  );
};

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Product } from '../api/adminApi';

interface ResidenceLimitsFieldsProps {
  product: Product;
  onNumber: (field: keyof Product, value: string, min?: number) => void;
}

const isResidencePass = (p: Product) => p.productId === 'residence_pass_yearly';
const isAgencyPlan = (p: Product) => p.productId === 'agency_yearly';

/**
 * Residence numbers on the two products that carry them: buildings included
 * (Residence Pass) and free residences per subscription year (agency plan).
 * These drive the residence rules and the {includedBuildings} /
 * {residencesPerYear} placeholders in the feature texts.
 */
export const ResidenceLimitsFields: React.FC<ResidenceLimitsFieldsProps> = ({ product, onNumber }) => {
  const { t } = useTranslation(['admin']);
  if (!isResidencePass(product) && !isAgencyPlan(product)) return null;
  const field = isResidencePass(product) ? 'includedBuildings' : 'residencesPerYear';
  const id = `residence-${field}`;

  return (
    <div className="mb-4 rounded-lg border-2 border-teal-300 bg-white p-4">
      <label htmlFor={id} className="block font-semibold text-teal-800">
        {isResidencePass(product)
          ? t('admin:pricing.form.includedBuildings', 'Buildings included per residence')
          : t('admin:pricing.form.residencesPerYear', 'Free residences per subscription year')}
      </label>
      <p className="mb-2 text-xs text-gray-600">
        {isResidencePass(product)
          ? t('admin:pricing.form.includedBuildingsDesc', 'Every residence can have this many buildings; more are unlocked per residence. Use {includedBuildings} in the features.')
          : t('admin:pricing.form.residencesPerYearDesc', 'Agencies can publish this many residences for free each subscription year. Use {residencesPerYear} in the features.')}
      </p>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={isResidencePass(product) ? 1 : 0}
        max={isResidencePass(product) ? 1000 : 100}
        value={product[field] ?? ''}
        onChange={(e) => onNumber(field, e.target.value, isResidencePass(product) ? 1 : 0)}
        className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-semibold focus:border-transparent focus:ring-2 focus:ring-teal-500 sm:w-48"
      />
    </div>
  );
};

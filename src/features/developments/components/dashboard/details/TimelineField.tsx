import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/src/shared/components/ui/Input';
import { MIN_YEAR_BUILT } from '../../../validation/developmentValidation';

interface TimelineFieldProps {
  constructionStatus: string;
  expectedCompletionDate: string;
  yearBuilt: string;
  onChange: (patch: { expectedCompletionDate?: string; yearBuilt?: string }) => void;
  error?: string;
  disabled: boolean;
}

/**
 * The date that fits the stage: a finished residence shows the year it was
 * built; one still planned or under construction shows its expected
 * completion. The server keeps only the one that applies.
 */
export const TimelineField: React.FC<TimelineFieldProps> = ({ constructionStatus, expectedCompletionDate, yearBuilt, onChange, error, disabled }) => {
  const { t } = useTranslation('developments');
  if (constructionStatus === 'completed') {
    return (
      <Input
        type="number"
        inputMode="numeric"
        label={t('details.yearBuilt', 'Year built')}
        placeholder={String(new Date().getFullYear())}
        min={MIN_YEAR_BUILT}
        max={new Date().getFullYear()}
        step={1}
        value={yearBuilt}
        onChange={(e) => onChange({ yearBuilt: e.target.value })}
        error={error}
        disabled={disabled}
      />
    );
  }
  return (
    <Input
      type="date"
      label={t('details.completion', 'Expected completion')}
      value={expectedCompletionDate}
      onChange={(e) => onChange({ expectedCompletionDate: e.target.value })}
      disabled={disabled}
    />
  );
};

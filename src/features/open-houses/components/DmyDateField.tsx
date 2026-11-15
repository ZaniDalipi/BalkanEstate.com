import React from 'react';
import { useTranslation } from 'react-i18next';
import { autoFormatDate } from '@/src/shared/utils/dmyDate';
import FormField from './FormField';

interface DmyDateFieldProps {
  label: string;
  value: string; // dd/mm/yyyy (possibly half typed)
  onChange: (value: string) => void;
  error?: string;
}

/**
 * A date typed as dd/mm/yyyy — the same on every device. (The browser's own
 * date picker shows whatever order the phone's locale uses.) Slashes are added
 * while typing; the form checks it is a real date.
 */
const DmyDateField: React.FC<DmyDateFieldProps> = ({ label, value, onChange, error }) => {
  const { t } = useTranslation('property');
  return (
    <FormField
      label={label}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={t('openHouse.datePlaceholder', { defaultValue: 'dd/mm/yyyy' })}
      maxLength={10}
      value={value}
      onChange={(e) => onChange(autoFormatDate(e.target.value))}
      error={error}
    />
  );
};

export default DmyDateField;

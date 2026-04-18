import React from 'react';
import {
  ALL_PHONE_COUNTRY_CODES,
  BALKAN_PHONE_CODES,
  formatPhoneNumber,
  getPhonePlaceholder,
} from '@/constants/phoneCountryCodes';

interface PhoneInputProps {
  value: string; // E.164 full phone, e.g. "+38971234567" or ""
  onChange: (fullPhone: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** Style variant: "glass" (auth modal style) | "bordered" (default form style) */
  variant?: 'glass' | 'bordered';
}

/**
 * Parse a full E.164 phone string into { countryCode, localDigits }.
 * Falls back to the first Balkan code if no match found.
 */
export function parsePhoneValue(fullPhone: string): { countryCode: string; localDigits: string } {
  if (!fullPhone || typeof fullPhone !== 'string') {
    return { countryCode: ALL_PHONE_COUNTRY_CODES[0].code, localDigits: '' };
  }

  const trimmed = fullPhone.trim();

  // Try longest-match first (e.g. +383 before +38)
  const sorted = [...ALL_PHONE_COUNTRY_CODES].sort(
    (a, b) => b.code.length - a.code.length
  );

  for (const cc of sorted) {
    if (trimmed.startsWith(cc.code)) {
      const afterCode = trimmed.slice(cc.code.length);
      const localDigits = afterCode.replace(/\D/g, '');
      return { countryCode: cc.code, localDigits };
    }
  }

  // No country code match found - extract digits only
  const allDigits = trimmed.replace(/\D/g, '');
  return { countryCode: ALL_PHONE_COUNTRY_CODES[0].code, localDigits: allDigits };
}

/**
 * Build E.164 phone string from country code + local digits.
 * Returns "" when localDigits is empty.
 */
export function buildFullPhone(countryCode: string, localDigits: string): string {
  const digits = localDigits.replace(/\D/g, '');
  return digits ? `${countryCode}${digits}` : '';
}

/**
 * Validate a full E.164 phone string.
 * Returns an error string or null when valid.
 */
export function validateFullPhone(
  fullPhone: string,
  required = true,
  t?: (key: string, fallback: string) => string
): string | null {
  const tr = t ?? ((_key: string, fallback: string) => fallback);
  if (!fullPhone || !fullPhone.replace(/\D/g, '')) {
    return required
      ? tr('auth:validation.phone.required', 'Phone number is required')
      : null;
  }
  const { localDigits } = parsePhoneValue(fullPhone);
  if (!/^\d+$/.test(localDigits)) {
    return tr('auth:validation.phone.digitsOnly', 'Phone number must contain only digits');
  }
  if (localDigits.length < 6 || localDigits.length > 12) {
    return tr('auth:validation.phone.invalidLength', 'Phone number must be between 6 and 12 digits');
  }
  return null;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  className = '',
  variant = 'bordered',
}) => {
  // Parse the full phone into country code and local digits
  const { countryCode, localDigits } = parsePhoneValue(value);
  const formattedLocal = formatPhoneNumber(countryCode, localDigits);

  // Handle country code changes explicitly and immediately
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    if (!newCode) return; // Safety check
    // Always rebuild with new country code and current digits
    const currentDigits = localDigits || '';
    onChange(buildFullPhone(newCode, currentDigits));
  };

  // Handle local number input changes
  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const digits = rawInput.replace(/\D/g, '');
    // Rebuild the full phone number with current country code
    onChange(buildFullPhone(countryCode, digits));
  };

  const isGlass = variant === 'glass';

  const wrapperCls = isGlass
    ? `flex items-center rounded-2xl border-2 transition-all duration-300 bg-white/50 backdrop-blur-sm overflow-hidden ${
        error
          ? 'border-red-300 focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-100'
          : 'border-white/60 hover:border-white/80 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10'
      } ${className}`
    : `flex items-center rounded-lg border bg-white transition-all ${
        error
          ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-200'
          : 'border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400'
      } ${className}`;

  const selectCls = isGlass
    ? 'bg-transparent text-sm text-neutral-700 font-medium pl-4 pr-1 py-4 border-none focus:outline-none focus:ring-0 cursor-pointer max-w-[140px] flex-shrink-0'
    : 'bg-transparent text-sm text-gray-700 font-medium pl-3 pr-1 py-2.5 border-none focus:outline-none focus:ring-0 cursor-pointer flex-shrink-0';

  const dividerCls = isGlass
    ? 'w-px h-6 bg-neutral-300/60 flex-shrink-0'
    : 'w-px h-5 bg-gray-200 flex-shrink-0';

  const inputCls = isGlass
    ? 'flex-1 min-w-0 bg-transparent text-base text-neutral-900 px-3 py-4 border-none focus:outline-none focus:ring-0 placeholder:text-neutral-400'
    : 'flex-1 min-w-0 bg-transparent text-sm text-gray-900 px-3 py-2.5 border-none focus:outline-none focus:ring-0 placeholder:text-gray-300';

  // Ensure countryCode is always valid (fallback to Kosovo if not found)
  const validCountryCode = ALL_PHONE_COUNTRY_CODES.some(cc => cc.code === countryCode)
    ? countryCode
    : ALL_PHONE_COUNTRY_CODES[0].code;

  return (
    <div className={wrapperCls}>
      <select
        value={validCountryCode}
        onChange={handleCountryChange}
        disabled={disabled}
        className={selectCls}
        aria-label="Country code"
        title={`Select country code`}
      >
        {ALL_PHONE_COUNTRY_CODES.map((cc, i) => (
          <React.Fragment key={`${cc.country}-${cc.code}`}>
            {i === BALKAN_PHONE_CODES.length && (
              <option disabled>──────────</option>
            )}
            <option value={cc.code} key={`opt-${cc.code}`}>
              {cc.flag} {cc.code}
            </option>
          </React.Fragment>
        ))}
      </select>
      <div className={dividerCls} />
      <input
        type="tel"
        value={formattedLocal}
        onChange={handleLocalChange}
        disabled={disabled}
        required={required}
        placeholder={getPhonePlaceholder(validCountryCode)}
        className={inputCls}
        autoComplete="tel-national"
        aria-label="Phone number"
        aria-invalid={!!error}
      />
    </div>
  );
};

export default PhoneInput;

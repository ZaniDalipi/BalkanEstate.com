import React, { useState, useEffect, useRef } from 'react';
import {
  ALL_PHONE_COUNTRY_CODES,
  BALKAN_PHONE_CODES,
  formatPhoneNumber,
  getPhonePlaceholder,
  detectPhoneCodeSync,
  getCachedDefaultPhoneCode,
} from '@/constants/phoneCountryCodes';

interface PhoneInputProps {
  value: string; // E.164 full phone, e.g. "+38971234567" or ""
  onChange: (fullPhone: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** Lets a caller's own `<label htmlFor>` associate with the number field. */
  id?: string;
  /** Style variant: "glass" (auth modal style) | "bordered" (default form style) */
  variant?: 'glass' | 'bordered';
  /**
   * Dial code to preselect when the field is empty (e.g. '+355'). When omitted,
   * the input guesses from the visitor's browser locale so it isn't a fixed
   * default; if that can't be resolved it falls back to the first Balkan code.
   */
  defaultCountryCode?: string;
}

/**
 * Best-effort guess of the visitor's dial code from their browser locale
 * (no geolocation permission needed, works offline). Returns null when the
 * region can't be resolved or isn't in our supported list — callers fall back.
 */
export function guessDialCodeFromLocale(): string | null {
  if (typeof navigator === 'undefined') return null;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    if (!lang) continue;
    let region: string | undefined;
    try {
      const loc = new Intl.Locale(lang);
      region = (loc.maximize?.().region || loc.region) ?? undefined;
    } catch {
      region = lang.split('-')[1]?.toUpperCase();
    }
    if (!region) continue;
    const match = ALL_PHONE_COUNTRY_CODES.find(c => c.country === region);
    if (match) return match.code;
  }
  return null;
}

/**
 * Parse a full E.164 phone string into { countryCode, localDigits }.
 * Falls back to the first Balkan code (Kosovo) if no match found.
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
      const localDigits = trimmed.slice(cc.code.length).replace(/\D/g, '');
      return { countryCode: cc.code, localDigits };
    }
  }

  const allDigits = trimmed.replace(/\D/g, '');
  return { countryCode: ALL_PHONE_COUNTRY_CODES[0].code, localDigits: allDigits };
}

/**
 * Build E.164 phone string from country code + local digits.
 * Strips leading zeros (E.164 format doesn't allow them — required for WhatsApp/Viber).
 * Returns "" when localDigits is empty so callers can distinguish "no number" from a number.
 */
export function buildFullPhone(countryCode: string, localDigits: string): string {
  const digits = localDigits.replace(/\D/g, '');
  const stripped = digits.replace(/^0+/, '');
  return stripped ? `${countryCode}${stripped}` : '';
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
    return tr(
      'auth:validation.phone.invalidLength',
      'Phone number must be between 6 and 12 digits'
    );
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
  defaultCountryCode,
  id,
}) => {
  // Parse the incoming value to extract any country code already embedded in it
  const parsed = parsePhoneValue(value);

  // Track selected country code in LOCAL state so it persists even when
  // the phone field is empty. When the field starts empty we preselect the
  // caller's default, then the visitor's locale-guessed country, and only
  // fall back to the first Balkan code — so it's never a fixed "+383" default.
  const [selectedCode, setSelectedCode] = useState<string>(() => {
    if (value && value.trim()) return parsed.countryCode;
    return defaultCountryCode || guessDialCodeFromLocale() || parsed.countryCode;
  });

  // Becomes true once the user picks a country or types — after that we never
  // auto-override their choice (e.g. from async IP detection).
  const userTouched = useRef(false);

  // If the parent pushes a value that contains a country code (e.g. loading
  // a saved profile), sync our local state to match.
  useEffect(() => {
    if (value && value.trim()) {
      const { countryCode } = parsePhoneValue(value);
      setSelectedCode(countryCode);
    }
  }, [value]);

  // Refine the default via IP-based detection (cached) while the field is
  // still empty and untouched — gives the most accurate "from" country.
  useEffect(() => {
    if (value && value.trim()) return;
    let cancelled = false;
    getCachedDefaultPhoneCode().then((code) => {
      if (!cancelled && !userTouched.current && !(value && value.trim())) {
        setSelectedCode(code);
      }
    });
    return () => {
      cancelled = true;
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Local digits are always derived from the value prop
  const localDigits = parsed.localDigits;
  const formattedLocal = formatPhoneNumber(selectedCode, localDigits);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    if (!newCode) return;

    userTouched.current = true;
    // Update local code immediately — this is what keeps the dropdown
    // responsive even when there are no digits yet
    setSelectedCode(newCode);

    // If there are already digits, rebuild the full number with the new code
    // If not, don't call onChange yet — the user still needs to type a number
    if (localDigits) {
      onChange(buildFullPhone(newCode, localDigits));
    }
  };

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    userTouched.current = true;
    // Always use selectedCode (local state) so the chosen country is respected
    onChange(buildFullPhone(selectedCode, digits));
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
    ? 'bg-transparent text-sm text-neutral-700 font-medium pl-4 pr-2 py-4 border-none focus:outline-none focus:ring-0 cursor-pointer flex-shrink-0 hover:text-neutral-900 transition-colors'
    : 'bg-transparent text-sm text-gray-700 font-medium pl-3 pr-2 py-2.5 border-none focus:outline-none focus:ring-0 cursor-pointer flex-shrink-0 hover:text-gray-900 transition-colors';

  const dividerCls = isGlass
    ? 'w-px h-6 bg-neutral-300/60 flex-shrink-0'
    : 'w-px h-5 bg-gray-200 flex-shrink-0';

  const inputCls = isGlass
    ? 'flex-1 min-w-0 bg-transparent text-base text-neutral-900 px-3 py-4 border-none focus:outline-none focus:ring-0 placeholder:text-neutral-400'
    : 'flex-1 min-w-0 bg-transparent text-sm text-gray-900 px-3 py-2.5 border-none focus:outline-none focus:ring-0 placeholder:text-gray-300';

  return (
    <div className={wrapperCls}>
      <select
        value={selectedCode}
        onChange={handleCountryChange}
        disabled={disabled}
        className={selectCls}
        aria-label="Country code"
      >
        {ALL_PHONE_COUNTRY_CODES.map((cc, i) => (
          <React.Fragment key={`${cc.country}-${cc.code}`}>
            {i === BALKAN_PHONE_CODES.length && (
              <option disabled>──────────</option>
            )}
            <option value={cc.code}>
              {cc.flag} {cc.code}
            </option>
          </React.Fragment>
        ))}
      </select>
      <div className={dividerCls} />
      <input
        id={id}
        type="tel"
        value={formattedLocal}
        onChange={handleLocalChange}
        disabled={disabled}
        required={required}
        placeholder={getPhonePlaceholder(selectedCode)}
        className={inputCls}
        autoComplete="tel-national"
        aria-label={id ? undefined : 'Phone number'}
        aria-invalid={!!error}
      />
    </div>
  );
};

export default PhoneInput;

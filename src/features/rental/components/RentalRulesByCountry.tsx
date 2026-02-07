import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const COUNTRY_FLAGS: Record<string, string> = {
  albania: '🇦🇱',
  'bosnia-herzegovina': '🇧🇦',
  bulgaria: '🇧🇬',
  croatia: '🇭🇷',
  greece: '🇬🇷',
  kosovo: '🇽🇰',
  montenegro: '🇲🇪',
  'north-macedonia': '🇲🇰',
  romania: '🇷🇴',
  serbia: '🇷🇸',
};

// Normalize country name to match translation keys
const normalizeCountry = (country: string): string => {
  if (!country) return '';
  const normalized = country.toLowerCase().trim().replace(/\s+/g, '-').replace(/-and-/g, '-');
  const map: Record<string, string> = {
    'shqipëria': 'albania',
    'shqiperia': 'albania',
    'bosna': 'bosnia-herzegovina',
    'crna-gora': 'montenegro',
    'makedonija': 'north-macedonia',
    'srbija': 'serbia',
    'hrvatska': 'croatia',
    'tirana': 'albania',
  };
  return map[normalized] || normalized;
};

interface RentalRulesByCountryProps {
  country: string;
}

const RentalRulesByCountry: React.FC<RentalRulesByCountryProps> = ({ country }) => {
  const { t } = useTranslation(['rental']);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const normalizedKey = normalizeCountry(country);
  const flag = COUNTRY_FLAGS[normalizedKey];

  // Check if we have translation data for this country
  const summary = t(`rental:rules.countries.${normalizedKey}.summary`, { defaultValue: '' });
  if (!summary || !flag) return null;

  const sectionKeys = ['lease', 'deposit', 'tenant', 'landlord'] as const;
  const sectionTitleKeys = ['leaseAgreement', 'securityDeposit', 'tenantRights', 'landlordObligations'] as const;

  // Get localized country name from the title pattern
  const countryName = t(`rental:rules.countries.${normalizedKey}.summary`, { defaultValue: '' })
    ? country
    : country;

  return (
    <div className="relative bg-white/70 backdrop-blur-xl p-5 sm:p-6 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/60 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-white/80 to-amber-50/60 backdrop-blur-sm border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <span>{flag}</span>
              {t('rental:rules.title', { country: countryName })}
            </h3>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-neutral-600 mb-4 leading-relaxed">{summary}</p>

        {/* Expandable rule sections */}
        <div className="space-y-2">
          {sectionKeys.map((sectionKey, idx) => {
            const items = t(`rental:rules.countries.${normalizedKey}.${sectionKey}`, { returnObjects: true, defaultValue: [] }) as string[];
            if (!Array.isArray(items) || items.length === 0) return null;

            return (
              <div key={sectionKey} className="rounded-xl border border-neutral-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-neutral-800">{t(`rental:rules.${sectionTitleKeys[idx]}`)}</span>
                  <svg
                    className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${expandedSection === idx ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSection === idx && (
                  <div className="px-4 pb-3">
                    <ul className="space-y-1.5">
                      {items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-neutral-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-neutral-400 mt-4 italic">
          {t('rental:rules.disclaimer')}
        </p>
      </div>
    </div>
  );
};

export default RentalRulesByCountry;

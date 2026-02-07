import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface RentalRule {
  title: string;
  items: string[];
}

interface CountryRentalInfo {
  country: string;
  flag: string;
  summary: string;
  rules: RentalRule[];
}

const RENTAL_RULES: Record<string, CountryRentalInfo> = {
  albania: {
    country: 'Albania',
    flag: '🇦🇱',
    summary: 'Albanian rental law is governed by the Civil Code (Articles 801-849). Contracts over 1 year should be registered.',
    rules: [
      {
        title: 'Lease Agreement',
        items: [
          'Written contract recommended; oral contracts valid but hard to enforce',
          'Leases over 1 year must be notarized and registered at the Immovable Property Registration Office (IPRO)',
          'Contract should specify rent amount, payment terms, duration, and deposit',
        ],
      },
      {
        title: 'Security Deposit',
        items: [
          'Typically 1-2 months rent',
          'Must be returned within 30 days of lease end if no damages',
          'Landlord must provide itemized deductions if withholding deposit',
        ],
      },
      {
        title: 'Tenant Rights',
        items: [
          'Landlord must maintain the property in habitable condition',
          'Tenant cannot be evicted without court order',
          'Minimum 3-month notice for lease termination (unless otherwise agreed)',
          'Rent increases require mutual agreement or contract clause',
        ],
      },
      {
        title: 'Landlord Obligations',
        items: [
          'Pay property tax and building maintenance fees',
          'Declare rental income to tax authorities (15% income tax)',
          'Ensure property meets safety and habitability standards',
        ],
      },
    ],
  },
  'bosnia-herzegovina': {
    country: 'Bosnia and Herzegovina',
    flag: '🇧🇦',
    summary: 'Rental law varies by entity (Federation of BiH and Republika Srpska). Written contracts are strongly recommended.',
    rules: [
      {
        title: 'Lease Agreement',
        items: [
          'Written contract required for legal protection',
          'Must be registered with the local tax authority',
          'Standard lease terms: 1 year with renewal option',
        ],
      },
      {
        title: 'Security Deposit',
        items: [
          'Usually 1-2 months rent',
          'Terms for return should be specified in contract',
        ],
      },
      {
        title: 'Tenant Rights',
        items: [
          'Right to a habitable property with basic utilities',
          'Eviction requires court process; minimum 30-day notice',
          'Tenant may terminate with notice as specified in contract',
        ],
      },
      {
        title: 'Landlord Obligations',
        items: [
          'Register the rental contract with tax authorities',
          'Pay income tax on rental earnings (10% flat rate)',
          'Maintain structural integrity of the property',
        ],
      },
    ],
  },
  bulgaria: {
    country: 'Bulgaria',
    flag: '🇧🇬',
    summary: 'Bulgarian rental law is based on the Obligations and Contracts Act. Leases over 1 year must be in writing.',
    rules: [
      {
        title: 'Lease Agreement',
        items: [
          'Written contract required for leases over 1 year',
          'Contract should be notarized for court enforceability',
          'Maximum lease duration: 10 years (can be renewed)',
        ],
      },
      {
        title: 'Security Deposit',
        items: [
          'Typically 1-2 months rent',
          'Must be returned at end of lease minus legitimate deductions',
        ],
      },
      {
        title: 'Tenant Rights',
        items: [
          'Right to quiet enjoyment of the property',
          'Landlord must give 1-month notice before termination',
          'Tenant can terminate with 1-month written notice',
          'Rent increase limited to once per year',
        ],
      },
      {
        title: 'Landlord Obligations',
        items: [
          'Pay 10% flat tax on rental income',
          'Maintain property in agreed condition',
          'Register contract with the National Revenue Agency',
        ],
      },
    ],
  },
  croatia: {
    country: 'Croatia',
    flag: '🇭🇷',
    summary: 'Croatian rental law is governed by the Lease of Flats Act (Zakon o najmu stanova). Contracts must be in writing.',
    rules: [
      {
        title: 'Lease Agreement',
        items: [
          'Written contract is mandatory',
          'Must be registered with the local tax office within 30 days',
          'Contract must include: parties, property description, rent, duration, termination terms',
        ],
      },
      {
        title: 'Security Deposit',
        items: [
          'Common practice: 1-2 months rent',
          'Not legally mandated but standard in practice',
          'Return conditions should be written in the contract',
        ],
      },
      {
        title: 'Tenant Rights',
        items: [
          'Tenant protected from arbitrary eviction',
          'Minimum 90-day notice period for termination by landlord',
          'Tenant can request necessary repairs',
          'Subletting only with landlord written consent',
        ],
      },
      {
        title: 'Landlord Obligations',
        items: [
          'Pay 12% income tax on rental income',
          'Maintain the property to habitable standards',
          'Provide receipt for rent payments if requested',
        ],
      },
    ],
  },
  greece: {
    country: 'Greece',
    flag: '🇬🇷',
    summary: 'Greek rental law provides strong tenant protections. Residential leases have a minimum 3-year duration by law.',
    rules: [
      {
        title: 'Lease Agreement',
        items: [
          'Written or oral contracts are valid; written strongly recommended',
          'Minimum residential lease duration: 3 years (by law)',
          'Landlord cannot terminate before 3 years without cause',
          'Contract should be filed with the Independent Authority for Public Revenue',
        ],
      },
      {
        title: 'Security Deposit',
        items: [
          'Typically 2 months rent',
          'Must be returned within 2 months of lease end',
          'Landlord must place deposit in interest-bearing account',
        ],
      },
      {
        title: 'Tenant Rights',
        items: [
          'Strong protection under Greek Civil Code (Articles 574-618)',
          'Tenant cannot be evicted during the 3-year minimum period',
          'Rent increases capped at 75% of annual CPI increase',
          'Right to renew lease under similar terms',
        ],
      },
      {
        title: 'Landlord Obligations',
        items: [
          'Declare rental income (taxed at 15-45% progressively)',
          'Issue annual rental income declaration',
          'Maintain property in condition agreed at lease signing',
        ],
      },
    ],
  },
  kosovo: {
    country: 'Kosovo',
    flag: '🇽🇰',
    summary: 'Kosovo rental law is based on the Law on Obligational Relationships. Written contracts are recommended.',
    rules: [
      {
        title: 'Lease Agreement',
        items: [
          'Written contract recommended for legal enforceability',
          'Should include rent amount, duration, and conditions',
          'No mandatory registration but advisable for tax purposes',
        ],
      },
      {
        title: 'Security Deposit',
        items: [
          'Typically 1 month rent',
          'Terms negotiated between parties',
        ],
      },
      {
        title: 'Tenant Rights',
        items: [
          'Right to a habitable dwelling',
          'Eviction requires reasonable notice (typically 30 days)',
          'Tenant can request essential repairs',
        ],
      },
      {
        title: 'Landlord Obligations',
        items: [
          'Declare rental income to Tax Administration of Kosovo',
          'Pay income tax on rental earnings (9% for individuals)',
          'Maintain property safety and habitability',
        ],
      },
    ],
  },
  montenegro: {
    country: 'Montenegro',
    flag: '🇲🇪',
    summary: 'Montenegrin rental law follows the Law on Housing. Written lease contracts must be registered.',
    rules: [
      {
        title: 'Lease Agreement',
        items: [
          'Written contract required',
          'Must be registered with the local municipality',
          'Should specify all terms including utilities responsibility',
        ],
      },
      {
        title: 'Security Deposit',
        items: [
          'Commonly 1-2 months rent',
          'Must be clearly defined in the contract',
        ],
      },
      {
        title: 'Tenant Rights',
        items: [
          'Right to quiet enjoyment',
          'Cannot be evicted without proper notice and legal process',
          'Entitled to habitable living conditions',
        ],
      },
      {
        title: 'Landlord Obligations',
        items: [
          'Register lease with municipal authorities',
          'Pay 9% tax on rental income',
          'Maintain the structural integrity of the property',
        ],
      },
    ],
  },
  'north-macedonia': {
    country: 'North Macedonia',
    flag: '🇲🇰',
    summary: 'North Macedonian rental law is based on the Law on Obligations. Written contracts provide the best legal protection.',
    rules: [
      {
        title: 'Lease Agreement',
        items: [
          'Written contract highly recommended',
          'Notarization adds enforceability',
          'Should include rent, payment schedule, duration, and termination clauses',
        ],
      },
      {
        title: 'Security Deposit',
        items: [
          'Typically 1 month rent',
          'Return conditions specified in contract',
        ],
      },
      {
        title: 'Tenant Rights',
        items: [
          'Right to a habitable property',
          'Minimum 30-day notice for eviction',
          'Can request repairs for essential services',
        ],
      },
      {
        title: 'Landlord Obligations',
        items: [
          'Declare rental income to Public Revenue Office',
          'Pay 10% personal income tax on rental earnings',
          'Maintain property to agreed standards',
        ],
      },
    ],
  },
  romania: {
    country: 'Romania',
    flag: '🇷🇴',
    summary: 'Romanian rental law is governed by the Civil Code (2011). Contracts must be registered with ANAF for tax compliance.',
    rules: [
      {
        title: 'Lease Agreement',
        items: [
          'Written contract is strongly recommended',
          'Must be registered with ANAF (tax authority) within 30 days',
          'Registered contracts are enforceable as execution titles',
          'Typical duration: 1-5 years',
        ],
      },
      {
        title: 'Security Deposit',
        items: [
          'Usually 1-3 months rent',
          'Must be returned within 30 days of lease end',
          'Deductions must be documented with evidence',
        ],
      },
      {
        title: 'Tenant Rights',
        items: [
          'Right to a habitable property in good condition',
          'Cannot be evicted without court order',
          'Minimum 60-day notice for non-renewal by landlord',
          'Rent increase conditions must be in the contract',
        ],
      },
      {
        title: 'Landlord Obligations',
        items: [
          'Pay 10% income tax on rental earnings',
          'Register contract with ANAF',
          'Issue receipts for all rent payments',
          'Maintain the property and pay for major repairs',
        ],
      },
    ],
  },
  serbia: {
    country: 'Serbia',
    flag: '🇷🇸',
    summary: 'Serbian rental law is based on the Law on Housing and Building Maintenance. Written contracts are mandatory.',
    rules: [
      {
        title: 'Lease Agreement',
        items: [
          'Written contract is legally required',
          'Must be certified by a notary for full enforceability',
          'Tenant must be registered at the property address (temporary residence)',
          'Contract should be reported to the Tax Administration',
        ],
      },
      {
        title: 'Security Deposit',
        items: [
          'Typically 1-2 months rent',
          'Usually held by the landlord, not in escrow',
          'Return terms should be specified in contract',
        ],
      },
      {
        title: 'Tenant Rights',
        items: [
          'Right to peaceful enjoyment of the property',
          'Eviction only through legal court process',
          'Minimum 90-day notice for lease non-renewal by landlord',
          'Tenant can deduct repair costs from rent if landlord fails to act',
        ],
      },
      {
        title: 'Landlord Obligations',
        items: [
          'Pay 20% income tax on rental income',
          'Register tenant at property address',
          'File annual tax returns including rental income',
          'Maintain common areas and structural elements',
        ],
      },
    ],
  },
};

// Normalize country name to match RENTAL_RULES keys
const normalizeCountry = (country: string): string => {
  if (!country) return '';
  const normalized = country.toLowerCase().trim().replace(/\s+/g, '-').replace(/-and-/g, '-');
  // Handle common variations
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
  const rentalInfo = RENTAL_RULES[normalizedKey];

  if (!rentalInfo) return null;

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
              <span>{rentalInfo.flag}</span>
              {t('rental:rules.title', { country: rentalInfo.country })}
            </h3>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-neutral-600 mb-4 leading-relaxed">{rentalInfo.summary}</p>

        {/* Expandable rule sections */}
        <div className="space-y-2">
          {rentalInfo.rules.map((rule, idx) => (
            <div key={idx} className="rounded-xl border border-neutral-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedSection(expandedSection === idx ? null : idx)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
              >
                <span className="text-sm font-semibold text-neutral-800">{rule.title}</span>
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
                    {rule.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-neutral-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
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

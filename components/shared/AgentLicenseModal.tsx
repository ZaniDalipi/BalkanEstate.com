import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Building2, KeyRound, Globe, ChevronDown, BadgeCheck, AlertCircle, Phone, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getAgencies } from '../../services/apiService';

// Countries that have license validation rules on the backend
const LICENSE_COUNTRIES = [
  { code: 'XK', label: 'Kosovo', flag: '🇽🇰' },
  { code: 'AL', label: 'Albania', flag: '🇦🇱' },
  { code: 'RS', label: 'Serbia', flag: '🇷🇸' },
  { code: 'MK', label: 'N. Macedonia', flag: '🇲🇰' },
  { code: 'BA', label: 'Bosnia & Herzegovina', flag: '🇧🇦' },
  { code: 'ME', label: 'Montenegro', flag: '🇲🇪' },
  { code: 'HR', label: 'Croatia', flag: '🇭🇷' },
  { code: 'SI', label: 'Slovenia', flag: '🇸🇮' },
  { code: 'BG', label: 'Bulgaria', flag: '🇧🇬' },
  { code: 'RO', label: 'Romania', flag: '🇷🇴' },
  { code: 'GR', label: 'Greece', flag: '🇬🇷' },
] as const;

const BALKAN_LANGUAGE_KEYS = [
  'English', 'Serbian', 'Croatian', 'Slovenian', 'Bosnian', 'Macedonian',
  'Albanian', 'Montenegrin', 'Bulgarian', 'Romanian', 'Greek', 'Turkish',
  'Hungarian', 'German', 'Italian', 'French', 'Russian', 'Spanish'
];

// Balkan country codes for phone number input (matching AuthModal)
const BALKAN_COUNTRY_CODES = [
  { code: '+383', country: 'XK', label: 'Kosovo', flag: '🇽🇰' },
  { code: '+355', country: 'AL', label: 'Albania', flag: '🇦🇱' },
  { code: '+381', country: 'RS', label: 'Serbia', flag: '🇷🇸' },
  { code: '+389', country: 'MK', label: 'N. Macedonia', flag: '🇲🇰' },
  { code: '+387', country: 'BA', label: 'Bosnia', flag: '🇧🇦' },
  { code: '+382', country: 'ME', label: 'Montenegro', flag: '🇲🇪' },
  { code: '+385', country: 'HR', label: 'Croatia', flag: '🇭🇷' },
  { code: '+386', country: 'SI', label: 'Slovenia', flag: '🇸🇮' },
  { code: '+359', country: 'BG', label: 'Bulgaria', flag: '🇧🇬' },
  { code: '+40', country: 'RO', label: 'Romania', flag: '🇷🇴' },
  { code: '+30', country: 'GR', label: 'Greece', flag: '🇬🇷' },
] as const;

const PHONE_FORMAT_PATTERNS: Record<string, number[]> = {
  '+383': [2, 3, 4],
  '+355': [2, 3, 4],
  '+381': [2, 3, 4],
  '+389': [2, 3, 3],
  '+387': [2, 3, 3],
  '+382': [2, 3, 3],
  '+385': [2, 3, 4],
  '+386': [2, 3, 2, 2],
  '+359': [2, 3, 4],
  '+40':  [3, 3, 3],
  '+30':  [3, 3, 4],
};

const formatPhoneNumber = (countryCode: string, digits: string): string => {
  const clean = digits.replace(/\D/g, '');
  const pattern = PHONE_FORMAT_PATTERNS[countryCode] || [3, 3, 4];
  const parts: string[] = [];
  let pos = 0;
  for (const groupSize of pattern) {
    if (pos >= clean.length) break;
    parts.push(clean.slice(pos, pos + groupSize));
    pos += groupSize;
  }
  if (pos < clean.length && parts.length > 0) {
    parts[parts.length - 1] += clean.slice(pos);
  }
  return parts.join(' ');
};

const getPhonePlaceholder = (countryCode: string): string => {
  const pattern = PHONE_FORMAT_PATTERNS[countryCode] || [3, 3, 4];
  return pattern.map(n => 'X'.repeat(n)).join(' ');
};

interface AgentLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (licenseData: {
    licenseNumber: string;
    licenseCountry?: string;
    phone?: string;
    agencyInvitationCode?: string;
    agentId?: string;
    selectedAgencyId?: string;
    languages?: string[];
  }) => Promise<void>;
  currentLicenseNumber?: string;
  currentAgentId?: string;
  currentPhone?: string;
  /** When true, only show the phone number field (for private seller role switch) */
  phoneOnly?: boolean;
}

const Field = ({
  id, label, icon, hint, required, children
}: {
  id?: string; label: string; icon: React.ReactNode;
  hint?: string; required?: boolean; children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest select-none">
      {icon}
      {label}
      {required && <span className="text-red-400 normal-case tracking-normal font-normal">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-400 leading-relaxed">{hint}</p>}
  </div>
);

const AgentLicenseModal: React.FC<AgentLicenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentLicenseNumber,
  currentAgentId,
  currentPhone,
  phoneOnly = false,
}) => {
  const { t } = useTranslation(['agents', 'modals', 'common']);
  const [licenseNumber, setLicenseNumber] = useState(currentLicenseNumber || '');
  const [licenseCountry, setLicenseCountry] = useState('');
  // Parse existing phone into country code + local number
  const [phoneCountryCode, setPhoneCountryCode] = useState(() => {
    if (currentPhone) {
      const match = BALKAN_COUNTRY_CODES.find(cc => currentPhone.startsWith(cc.code));
      if (match) return match.code;
    }
    return BALKAN_COUNTRY_CODES[0].code;
  });
  const [phone, setPhone] = useState(() => {
    if (currentPhone) {
      const match = BALKAN_COUNTRY_CODES.find(cc => currentPhone.startsWith(cc.code));
      if (match) {
        const local = currentPhone.slice(match.code.length).replace(/\D/g, '');
        return formatPhoneNumber(match.code, local);
      }
    }
    return '';
  });
  const [agencyInvitationCode, setAgencyInvitationCode] = useState('');
  const [agentId, setAgentId] = useState(currentAgentId || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [languages, setLanguages] = useState<string[]>(['English']);

  const isJoiningAgency = Boolean(currentLicenseNumber && currentAgentId);

  const handleLanguageToggle = (language: string) => {
    setLanguages(prev =>
      prev.includes(language)
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  useEffect(() => {
    if (isOpen && agencies.length === 0 && !loadingAgencies) fetchAgencies();
    if (!isOpen && agencies.length > 0) {
      setAgencies([]);
      setSelectedAgency('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const fetchAgencies = async () => {
    try {
      setLoadingAgencies(true);
      const response = await getAgencies({ limit: 100 });
      setAgencies(response.agencies || []);
    } catch {
      setAgencies([]);
    } finally {
      setLoadingAgencies(false);
    }
  };

  if (!isOpen) return null;

  // Phone is always required for agents and sellers
  const phoneRequired = true;

  const getFullPhone = () => {
    const digits = phone.replace(/\D/g, '');
    return digits ? `${phoneCountryCode}${digits}` : '';
  };

  const runSubmit = async () => {
    if (phoneOnly) {
      // Phone-only mode: only validate phone
      if (!phone.trim()) {
        setError(t('modals:agentLicense.phoneRequired', 'Phone number is required'));
        return;
      }
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 6 || digits.length > 12) {
        setError(t('modals:agentLicense.invalidPhone', 'Invalid phone number format'));
        return;
      }
      setError('');
      setIsSubmitting(true);
      try {
        await onSubmit({
          licenseNumber: '',
          phone: getFullPhone(),
        });
        setError('');
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save phone number.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!licenseNumber.trim()) {
      setError(t('modals:agentLicense.licenseRequired'));
      return;
    }
    if (!licenseCountry) {
      setError(t('modals:agentLicense.countryRequired', 'Please select the country where your license was issued'));
      return;
    }
    // Validate phone — required if user has no phone on record
    if (phoneRequired && !phone.trim()) {
      setError(t('modals:agentLicense.phoneRequired', 'Phone number is required'));
      return;
    }
    if (phone.trim()) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 6 || digits.length > 12) {
        setError(t('modals:agentLicense.invalidPhone', 'Invalid phone number format'));
        return;
      }
    }
    if (selectedAgency && !agencyInvitationCode.trim()) {
      setError(t('modals:agentLicense.invitationCodeRequired'));
      return;
    }
    if (agencyInvitationCode.trim() && !selectedAgency) {
      setError(t('modals:agentLicense.selectAgencyRequired'));
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({
        licenseNumber: licenseNumber.trim(),
        licenseCountry: licenseCountry || undefined,
        phone: getFullPhone() || undefined,
        agencyInvitationCode: agencyInvitationCode.trim() || undefined,
        agentId: agentId.trim() || undefined,
        selectedAgencyId: selectedAgency || undefined,
        languages: languages.length > 0 ? languages : undefined,
      });
      if (!isJoiningAgency) { setLicenseNumber(''); setLicenseCountry(''); setAgentId(''); }
      setAgencyInvitationCode('');
      setSelectedAgency('');
      setError('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify license. Please check your information and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); e.stopPropagation(); runSubmit(); };

  const handleClose = () => {
    if (!isSubmitting) {
      if (!isJoiningAgency) { setLicenseNumber(''); setLicenseCountry(''); setAgentId(''); }
      setAgencyInvitationCode('');
      setSelectedAgency('');
      setError('');
      onClose();
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 ' +
    'transition-all placeholder:text-gray-300 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-6"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full flex flex-col rounded-t-[2rem] sm:rounded-2xl max-h-[96dvh] sm:max-h-[85vh] sm:max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="relative flex items-center gap-4 px-6 pt-5 pb-5 sm:pt-6 flex-shrink-0 border-b border-gray-100">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${phoneOnly ? 'bg-emerald-600' : 'bg-blue-600'}`}>
            {phoneOnly
              ? <Phone className="w-5 h-5 text-white" />
              : isJoiningAgency
                ? <Building2 className="w-5 h-5 text-white" />
                : <ShieldCheck className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-snug">
              {phoneOnly
                ? t('modals:agentLicense.phoneOnlyTitle', 'Add Your Phone Number')
                : isJoiningAgency
                  ? t('modals:agentLicense.joinAgencyTitle')
                  : t('modals:agentLicense.title')}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {phoneOnly
                ? t('modals:agentLicense.phoneOnlyDescription', 'A phone number is needed for contact and to create property listings')
                : isJoiningAgency
                  ? t('modals:agentLicense.joinAgencyDescription')
                  : t('modals:agentLicense.newAgentDescription')}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 flex-shrink-0"
            aria-label={t('common:close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-6 py-5 space-y-5">

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 px-3.5 py-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 mt-px flex-shrink-0 text-red-400" />
                {error}
              </div>
            )}

            {phoneOnly ? (
              /* Phone-only mode for private seller role switch */
              <Field
                id="phone"
                label={t('modals:agentLicense.phoneNumber', 'Phone Number')}
                icon={<Phone className="w-3 h-3" />}
                required
                hint={t('modals:agentLicense.phoneOnlyHint', 'Your phone number will be shown on your listings so buyers can reach you.')}
              >
                <div className="flex items-center rounded-lg border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setPhoneCountryCode(newCode);
                      if (phone) {
                        const digits = phone.replace(/\D/g, '');
                        setPhone(formatPhoneNumber(newCode, digits));
                      }
                    }}
                    disabled={isSubmitting}
                    className="bg-transparent text-sm text-gray-700 font-medium pl-3 pr-1 py-2.5 border-none focus:outline-none focus:ring-0 cursor-pointer"
                  >
                    {BALKAN_COUNTRY_CODES.map((cc) => (
                      <option key={cc.code} value={cc.code}>
                        {cc.flag} {cc.code}
                      </option>
                    ))}
                  </select>
                  <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setPhone(formatPhoneNumber(phoneCountryCode, digits));
                    }}
                    disabled={isSubmitting}
                    placeholder={getPhonePlaceholder(phoneCountryCode)}
                    className="flex-1 bg-transparent text-sm text-gray-900 px-3 py-2.5 border-none focus:outline-none focus:ring-0 placeholder:text-gray-300"
                    autoFocus
                    required
                  />
                </div>
              </Field>
            ) : (
              /* Full agent registration form */
              <>
                {/* License + Agent ID — side by side on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="licenseNumber"
                    label={t('modals:agentLicense.licenseNumber')}
                    icon={<ShieldCheck className="w-3 h-3" />}
                    required
                    hint={isJoiningAgency
                      ? undefined
                      : t('modals:agentLicense.officialLicense')}
                  >
                    <input
                      type="text"
                      id="licenseNumber"
                      value={licenseNumber}
                      onChange={e => setLicenseNumber(e.target.value)}
                      disabled={isSubmitting || isJoiningAgency}
                      readOnly={isJoiningAgency}
                      placeholder={t('modals:agentLicense.licenseNumberPlaceholder')}
                      className={inputCls}
                      required
                    />
                    {isJoiningAgency && (
                      <p className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        {t('modals:agentLicense.verifiedLicense')}
                      </p>
                    )}
                  </Field>

                  <Field
                    id="agentId"
                    label={t('modals:agentLicense.agentId')}
                    icon={<KeyRound className="w-3 h-3" />}
                    hint={isJoiningAgency
                      ? t('modals:agentLicense.verifiedAgentId')
                      : t('modals:agentLicense.autoGeneratedAgentId')}
                  >
                    <div className="relative">
                      <input
                        type="text"
                        id="agentId"
                        value={agentId}
                        onChange={e => setAgentId(e.target.value)}
                        disabled={isSubmitting || isJoiningAgency}
                        readOnly={isJoiningAgency}
                        placeholder={t('modals:agentLicense.agentIdPlaceholder')}
                        className={inputCls}
                      />
                      {!isJoiningAgency && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-300 pointer-events-none">
                          {t('modals:agentLicense.optional')}
                        </span>
                      )}
                    </div>
                  </Field>
                </div>

                {/* License Country — required when license number is provided */}
                {!isJoiningAgency && (
                  <Field
                    id="licenseCountry"
                    label={t('modals:agentLicense.licenseCountry', 'License Country')}
                    icon={<MapPin className="w-3 h-3" />}
                    required
                    hint={t('modals:agentLicense.licenseCountryHint', 'Select the country where your license was issued')}
                  >
                    <div className="relative">
                      <select
                        id="licenseCountry"
                        value={licenseCountry}
                        onChange={e => { setLicenseCountry(e.target.value); setError(''); }}
                        disabled={isSubmitting}
                        required
                        className={`${inputCls} appearance-none pr-8`}
                      >
                        <option value="">
                          {t('modals:agentLicense.selectCountry', '-- Select Country --')}
                        </option>
                        {LICENSE_COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                    </div>
                  </Field>
                )}

                {/* Phone number — required if user has none on file */}
                {phoneRequired && (
                  <Field
                    id="phone"
                    label={t('modals:agentLicense.phoneNumber', 'Phone Number')}
                    icon={<Phone className="w-3 h-3" />}
                    required
                    hint={t('modals:agentLicense.phoneHint', 'Required for agents and sellers. Clients will use this to contact you.')}
                  >
                    <div className="flex items-center rounded-lg border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                      <select
                        value={phoneCountryCode}
                        onChange={(e) => {
                          const newCode = e.target.value;
                          setPhoneCountryCode(newCode);
                          if (phone) {
                            const digits = phone.replace(/\D/g, '');
                            setPhone(formatPhoneNumber(newCode, digits));
                          }
                        }}
                        disabled={isSubmitting}
                        className="bg-transparent text-sm text-gray-700 font-medium pl-3 pr-1 py-2.5 border-none focus:outline-none focus:ring-0 cursor-pointer"
                      >
                        {BALKAN_COUNTRY_CODES.map((cc) => (
                          <option key={cc.code} value={cc.code}>
                            {cc.flag} {cc.code}
                          </option>
                        ))}
                      </select>
                      <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
                      <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          setPhone(formatPhoneNumber(phoneCountryCode, digits));
                        }}
                        disabled={isSubmitting}
                        placeholder={getPhonePlaceholder(phoneCountryCode)}
                        className="flex-1 bg-transparent text-sm text-gray-900 px-3 py-2.5 border-none focus:outline-none focus:ring-0 placeholder:text-gray-300"
                        required
                      />
                    </div>
                  </Field>
                )}

                {/* Languages — new agents only */}
                {!isJoiningAgency && (
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest select-none">
                      <Globe className="w-3 h-3" />
                      {t('modals:agentLicense.languagesSpoken')}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {BALKAN_LANGUAGE_KEYS.map(lang => {
                        const on = languages.includes(lang);
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => handleLanguageToggle(lang)}
                            disabled={isSubmitting}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border capitalize transition-all disabled:opacity-50 ${
                              on
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                            }`}
                          >
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400">{t('modals:agentLicense.selectLanguages')}</p>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* Agency + Invitation Code — side by side on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="agencySelect"
                    label={t('modals:agentLicense.selectAgency')}
                    icon={<Building2 className="w-3 h-3" />}
                    required={isJoiningAgency}
                    hint={isJoiningAgency
                      ? t('modals:agentLicense.chooseAgency')
                      : t('modals:agentLicense.selectAgencyOrIndependent')}
                  >
                    {loadingAgencies ? (
                      <div className={`${inputCls} flex items-center gap-2 text-gray-300`}>
                        <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-blue-400 rounded-full animate-spin flex-shrink-0" />
                        {t('modals:agentLicense.loadingAgencies')}
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          id="agencySelect"
                          value={selectedAgency}
                          onChange={e => { setSelectedAgency(e.target.value); setError(''); }}
                          disabled={isSubmitting}
                          required={isJoiningAgency}
                          className={`${inputCls} appearance-none pr-8`}
                        >
                          <option value="">
                            {isJoiningAgency
                              ? t('modals:agentLicense.selectAnAgency')
                              : t('modals:agentLicense.independentAgent')}
                          </option>
                          {agencies.map(a => (
                            <option key={a._id} value={a._id}>
                              {a.name} ({a.city || t('modals:agentLicense.locationNA')})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                      </div>
                    )}
                  </Field>

                  <Field
                    id="agencyInvitationCode"
                    label={t('modals:agentLicense.invitationCode')}
                    icon={<KeyRound className="w-3 h-3" />}
                    required={isJoiningAgency}
                    hint={isJoiningAgency
                      ? t('modals:agentLicense.enterInvitationCode')
                      : t('modals:agentLicense.leaveEmptyForIndependent')}
                  >
                    <div className="relative">
                      <input
                        type="text"
                        id="agencyInvitationCode"
                        value={agencyInvitationCode}
                        onChange={e => setAgencyInvitationCode(e.target.value.toUpperCase())}
                        disabled={isSubmitting}
                        placeholder={t('modals:agentLicense.invitationCodePlaceholder')}
                        className={`${inputCls} font-mono tracking-widest`}
                        required={isJoiningAgency}
                      />
                      {!isJoiningAgency && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-300 pointer-events-none">
                          {t('modals:agentLicense.optional')}
                        </span>
                      )}
                    </div>
                  </Field>
                </div>
              </>
            )}
          </div>
        </form>

        {/* Footer */}
        <div
          className="flex items-center gap-3 px-6 pt-3 pb-5 border-t border-gray-100 bg-white rounded-b-2xl flex-shrink-0"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
          >
            {t('common:cancel')}
          </button>
          <button
            type="button"
            onClick={runSubmit}
            disabled={isSubmitting}
            className="ml-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {phoneOnly
                  ? t('modals:agentLicense.saving', 'Saving...')
                  : isJoiningAgency
                    ? t('modals:agentLicense.joining')
                    : t('modals:agentLicense.verifying')}
              </>
            ) : phoneOnly
              ? t('modals:agentLicense.saveAndContinue', 'Save & Continue')
              : isJoiningAgency
                ? t('modals:agentLicense.joinAgency')
                : t('modals:agentLicense.verifyAndBecomeAgent')
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentLicenseModal;

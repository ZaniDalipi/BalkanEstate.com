import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Building2, KeyRound, Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getAgencies } from '../../services/apiService';

// Language keys for the Balkan region - display names come from i18n
const BALKAN_LANGUAGE_KEYS = [
  'english', 'serbian', 'croatian', 'slovenian', 'bosnian', 'macedonian',
  'albanian', 'montenegrin', 'bulgarian', 'romanian', 'greek', 'turkish',
  'hungarian', 'german', 'italian', 'french', 'russian', 'spanish'
];

interface AgentLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (licenseData: {
    licenseNumber: string;
    agencyInvitationCode?: string;
    agentId?: string;
    selectedAgencyId?: string;
    languages?: string[];
  }) => Promise<void>;
  currentLicenseNumber?: string;
  currentAgentId?: string;
}

const AgentLicenseModal: React.FC<AgentLicenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentLicenseNumber,
  currentAgentId,
}) => {
  const { t } = useTranslation(['agents', 'modals', 'common']);
  const [licenseNumber, setLicenseNumber] = useState(currentLicenseNumber || '');
  const [agencyInvitationCode, setAgencyInvitationCode] = useState('');
  const [agentId, setAgentId] = useState(currentAgentId || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [languages, setLanguages] = useState<string[]>(['english']);

  const isJoiningAgency = Boolean(currentLicenseNumber && currentAgentId);

  const handleLanguageToggle = (language: string) => {
    setLanguages(prev =>
      prev.includes(language)
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  useEffect(() => {
    if (isOpen && agencies.length === 0 && !loadingAgencies) {
      fetchAgencies();
    }
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

  const runSubmit = async () => {
    if (!licenseNumber.trim()) {
      setError(t('modals:agentLicense.licenseRequired'));
      return;
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
        agencyInvitationCode: agencyInvitationCode.trim() || undefined,
        agentId: agentId.trim() || undefined,
        selectedAgencyId: selectedAgency || undefined,
        languages: languages.length > 0 ? languages : undefined,
      });

      if (!isJoiningAgency) {
        setLicenseNumber('');
        setAgentId('');
      }
      setAgencyInvitationCode('');
      setSelectedAgency('');
      setError('');
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to verify license. Please check your information and try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    runSubmit();
  };

  const handleClose = () => {
    if (!isSubmitting) {
      if (!isJoiningAgency) {
        setLicenseNumber('');
        setAgentId('');
      }
      setAgencyInvitationCode('');
      setSelectedAgency('');
      setError('');
      onClose();
    }
  };

  const handleAgencySelect = (agencyId: string) => {
    setSelectedAgency(agencyId);
    setError('');
  };

  const inputCls =
    'w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-base focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed placeholder:text-gray-400';

  return (
    /*
     * Overlay
     *  mobile : items-end  → bottom sheet slides up, backdrop above
     *  sm+    : items-center → centered dialog
     */
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50
                 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="
          bg-white w-full flex flex-col
          rounded-t-3xl sm:rounded-2xl
          max-h-[92dvh] sm:max-h-[90vh] sm:max-w-lg
          shadow-2xl
        "
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle – mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4 sm:pt-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                {isJoiningAgency
                  ? t('modals:agentLicense.joinAgencyTitle')
                  : t('modals:agentLicense.title')}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5 truncate">
                {isJoiningAgency
                  ? t('modals:agentLicense.joinAgencyDescription')
                  : t('modals:agentLicense.newAgentDescription')}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 rounded-2xl transition-colors disabled:opacity-40 flex-shrink-0 ml-2"
            aria-label={t('common:close')}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-5"
        >
          {/* Error banner */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* ── License Number ─────────────────────────────── */}
          <div className="space-y-1.5">
            <label
              htmlFor="licenseNumber"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"
            >
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              {t('modals:agentLicense.licenseNumber')}
              <span className="text-red-400">*</span>
            </label>
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
            <p className="text-xs text-gray-400 px-1">
              {isJoiningAgency
                ? t('modals:agentLicense.verifiedLicense')
                : t('modals:agentLicense.officialLicense')}
            </p>
          </div>

          {/* ── Agent ID ───────────────────────────────────── */}
          <div className="space-y-1.5">
            <label
              htmlFor="agentId"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"
            >
              <KeyRound className="w-4 h-4 text-blue-500" />
              {t('modals:agentLicense.agentId')}
              {!isJoiningAgency && (
                <span className="text-gray-400 font-normal text-xs">
                  ({t('modals:agentLicense.optional')})
                </span>
              )}
            </label>
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
            <p className="text-xs text-gray-400 px-1">
              {isJoiningAgency
                ? t('modals:agentLicense.verifiedAgentId')
                : t('modals:agentLicense.autoGeneratedAgentId')}
            </p>
          </div>

          {/* ── Languages (new agents only) ────────────────── */}
          {!isJoiningAgency && (
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                <Globe className="w-4 h-4 text-blue-500" />
                {t('modals:agentLicense.languagesSpoken')}
              </label>
              {/* 3-column grid for easy tapping on mobile */}
              <div className="grid grid-cols-3 gap-2">
                {BALKAN_LANGUAGE_KEYS.map((language: string) => {
                  const selected = languages.includes(language);
                  return (
                    <button
                      key={language}
                      type="button"
                      onClick={() => handleLanguageToggle(language)}
                      disabled={isSubmitting}
                      className={`
                        min-h-[44px] px-2 py-2 text-sm rounded-2xl border font-medium
                        transition-all active:scale-95 capitalize
                        ${selected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200 active:bg-gray-100'
                        }
                        disabled:opacity-50
                      `}
                    >
                      {language}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 px-1">
                {t('modals:agentLicense.selectLanguages')}
              </p>
            </div>
          )}

          {/* ── Agency Selection ───────────────────────────── */}
          <div className="space-y-1.5">
            <label
              htmlFor="agencySelect"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"
            >
              <Building2 className="w-4 h-4 text-blue-500" />
              {t('modals:agentLicense.selectAgency')}
              {isJoiningAgency ? (
                <span className="text-red-400">*</span>
              ) : (
                <span className="text-gray-400 font-normal text-xs">
                  ({t('modals:agentLicense.optional')})
                </span>
              )}
            </label>
            {loadingAgencies ? (
              <div className={`${inputCls} text-gray-400 flex items-center gap-2`}>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                {t('modals:agentLicense.loadingAgencies')}
              </div>
            ) : (
              <div className="relative">
                <select
                  id="agencySelect"
                  value={selectedAgency}
                  onChange={e => handleAgencySelect(e.target.value)}
                  disabled={isSubmitting}
                  required={isJoiningAgency}
                  className={`${inputCls} appearance-none pr-10`}
                >
                  <option value="">
                    {isJoiningAgency
                      ? t('modals:agentLicense.selectAnAgency')
                      : t('modals:agentLicense.independentAgent')}
                  </option>
                  {agencies.map(agency => (
                    <option key={agency._id} value={agency._id}>
                      {agency.name} ({agency.city || 'N/A'})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
            <p className="text-xs text-gray-400 px-1">
              {isJoiningAgency
                ? t('modals:agentLicense.chooseAgency')
                : t('modals:agentLicense.selectAgencyOrIndependent')}
            </p>
          </div>

          {/* ── Invitation Code ────────────────────────────── */}
          <div className="space-y-1.5">
            <label
              htmlFor="agencyInvitationCode"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"
            >
              <KeyRound className="w-4 h-4 text-blue-500" />
              {t('modals:agentLicense.invitationCode')}
              {isJoiningAgency ? (
                <span className="text-red-400">*</span>
              ) : (
                <span className="text-gray-400 font-normal text-xs">
                  ({t('modals:agentLicense.optional')})
                </span>
              )}
            </label>
            <input
              type="text"
              id="agencyInvitationCode"
              value={agencyInvitationCode}
              onChange={e =>
                setAgencyInvitationCode(e.target.value.toUpperCase())
              }
              disabled={isSubmitting}
              placeholder={t('modals:agentLicense.invitationCodePlaceholder')}
              className={`${inputCls} font-mono tracking-widest`}
              required={isJoiningAgency}
            />
            <p className="text-xs text-gray-400 px-1">
              {isJoiningAgency
                ? t('modals:agentLicense.enterInvitationCode')
                : t('modals:agentLicense.leaveEmptyForIndependent')}
            </p>
          </div>
        </form>

        {/* Sticky footer */}
        <div
          className="flex gap-3 px-5 pt-4 pb-5 border-t border-gray-100 bg-white rounded-b-2xl flex-shrink-0"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-base disabled:opacity-40"
          >
            {t('common:cancel')}
          </button>
          <button
            type="button"
            onClick={runSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-indigo-700 active:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isJoiningAgency
                  ? t('modals:agentLicense.joining')
                  : t('modals:agentLicense.verifying')}
              </>
            ) : isJoiningAgency ? (
              t('modals:agentLicense.joinAgency')
            ) : (
              t('modals:agentLicense.verifyAndBecomeAgent')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentLicenseModal;

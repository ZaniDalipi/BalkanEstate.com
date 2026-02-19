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

  // Check if user is already an agent (joining agency) vs becoming new agent
  const isJoiningAgency = Boolean(currentLicenseNumber && currentAgentId);

  const handleLanguageToggle = (language: string) => {
    setLanguages(prev =>
      prev.includes(language)
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  // Fetch agencies when modal opens
  useEffect(() => {
    if (isOpen && agencies.length === 0 && !loadingAgencies) {
      fetchAgencies();
    }
    if (!isOpen && agencies.length > 0) {
      setAgencies([]);
      setSelectedAgency('');
    }
  }, [isOpen]);

  // Lock body scroll when open
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

  // Input base classes – uniform on all screen sizes
  const inputCls =
    'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed';

  return (
    /*
     * Overlay:
     *  - Mobile  : slide-up bottom sheet  (items-end, p-0)
     *  - Tablet+ : centered dialog        (items-center, p-4)
     */
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50
                 flex items-end justify-center
                 sm:items-center sm:p-4"
      onClick={handleClose}
    >
      {/*
       * Sheet / Dialog container:
       *  - Mobile  : full-width, rounded top, max-h ~92dvh
       *  - Tablet+ : max-w-lg, fully rounded, max-h 90vh
       */}
      <div
        className="
          bg-white w-full flex flex-col
          rounded-t-3xl
          max-h-[92dvh] min-h-[50dvh]
          sm:rounded-2xl sm:max-w-lg sm:max-h-[90vh]
          shadow-2xl
        "
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle – visible on mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                {isJoiningAgency
                  ? t('agentLicense.joinAgencyTitle')
                  : t('agentLicense.title')}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {isJoiningAgency
                  ? t('agentLicense.joinAgencyDescription')
                  : t('agentLicense.newAgentDescription')}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-40 flex-shrink-0 ml-2"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        >
          {/* Error banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* ── License Number ───────────────────────────────── */}
          <div>
            <label
              htmlFor="licenseNumber"
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('agentLicense.licenseNumber')}{' '}
              <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="licenseNumber"
              value={licenseNumber}
              onChange={e => setLicenseNumber(e.target.value)}
              disabled={isSubmitting || isJoiningAgency}
              readOnly={isJoiningAgency}
              placeholder={t('agentLicense.licenseNumberPlaceholder')}
              className={inputCls}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {isJoiningAgency
                ? t('agentLicense.verifiedLicense')
                : t('agentLicense.officialLicense')}
            </p>
          </div>

          {/* ── Agent ID ─────────────────────────────────────── */}
          <div>
            <label
              htmlFor="agentId"
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {t('agentLicense.agentId')}{' '}
              {!isJoiningAgency && (
                <span className="text-gray-400 font-normal normal-case tracking-normal">
                  ({t('agentLicense.optional')})
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
              placeholder={t('agentLicense.agentIdPlaceholder')}
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">
              {isJoiningAgency
                ? t('agentLicense.verifiedAgentId')
                : t('agentLicense.autoGeneratedAgentId')}
            </p>
          </div>

          {/* ── Languages (new agents only) ──────────────────── */}
          {!isJoiningAgency && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5" />
                {t('agentLicense.languagesSpoken')}
              </label>
              {/* Responsive tag cloud – wraps naturally on all widths */}
              <div className="flex flex-wrap gap-2">
                {BALKAN_LANGUAGES.map(language => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => handleLanguageToggle(language)}
                    disabled={isSubmitting}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-all
                      ${languages.includes(language)
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                      } disabled:opacity-50`}
                  >
                    {language}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {t('agentLicense.selectLanguages')}
              </p>
            </div>
          )}

          {/* ── Agency Selection ─────────────────────────────── */}
          <div>
            <label
              htmlFor="agencySelect"
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider"
            >
              <Building2 className="w-3.5 h-3.5" />
              {t('agentLicense.selectAgency')}{' '}
              {isJoiningAgency ? (
                <span className="text-red-400">*</span>
              ) : (
                <span className="text-gray-400 font-normal normal-case tracking-normal">
                  ({t('agentLicense.optional')})
                </span>
              )}
            </label>
            {loadingAgencies ? (
              <div className={`${inputCls} text-gray-400 flex items-center gap-2`}>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                {t('agentLicense.loadingAgencies')}
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
                      ? t('agentLicense.selectAnAgency')
                      : t('agentLicense.independentAgent')}
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
            <p className="text-xs text-gray-400 mt-1">
              {isJoiningAgency
                ? t('agentLicense.chooseAgency')
                : t('agentLicense.selectAgencyOrIndependent')}
            </p>
          </div>

          {/* ── Invitation Code ──────────────────────────────── */}
          <div>
            <label
              htmlFor="agencyInvitationCode"
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {t('agentLicense.invitationCode')}{' '}
              {isJoiningAgency ? (
                <span className="text-red-400">*</span>
              ) : (
                <span className="text-gray-400 font-normal normal-case tracking-normal">
                  ({t('agentLicense.optional')})
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
              placeholder={t('agentLicense.invitationCodePlaceholder')}
              className={`${inputCls} font-mono tracking-widest`}
              required={isJoiningAgency}
            />
            <p className="text-xs text-gray-400 mt-1">
              {isJoiningAgency
                ? t('agentLicense.enterInvitationCode')
                : t('agentLicense.leaveEmptyForIndependent')}
            </p>
          </div>
        </form>

        {/* Sticky footer – action buttons */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-white rounded-b-3xl sm:rounded-b-2xl flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-40"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={runSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isJoiningAgency
                  ? t('agentLicense.joining')
                  : t('agentLicense.verifying')}
              </>
            ) : isJoiningAgency ? (
              t('agentLicense.joinAgency')
            ) : (
              t('agentLicense.verifyAndBecomeAgent')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentLicenseModal;

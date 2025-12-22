import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getAgencies } from '../../services/apiService';

// Common languages spoken in the Balkan region
const BALKAN_LANGUAGES = [
  'English', 'Serbian', 'Croatian', 'Slovenian', 'Bosnian', 'Macedonian',
  'Albanian', 'Montenegrin', 'Bulgarian', 'Romanian', 'Greek', 'Turkish',
  'Hungarian', 'German', 'Italian', 'French', 'Russian', 'Spanish'
];

interface AgentLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (licenseData: { licenseNumber: string; agencyInvitationCode?: string; agentId?: string; selectedAgencyId?: string; languages?: string[] }) => Promise<void>;
  currentLicenseNumber?: string;
  currentAgentId?: string;
}

const AgentLicenseModal: React.FC<AgentLicenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentLicenseNumber,
  currentAgentId
}) => {
  const { t } = useTranslation(['modals']);
  const [licenseNumber, setLicenseNumber] = useState(currentLicenseNumber || '');
  const [agencyInvitationCode, setAgencyInvitationCode] = useState('');
  const [agentId, setAgentId] = useState(currentAgentId || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [languages, setLanguages] = useState<string[]>(['English']);

  const handleLanguageToggle = (language: string) => {
    setLanguages(prev =>
      prev.includes(language)
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  // Check if user is already an agent (joining agency) vs becoming new agent
  const isJoiningAgency = Boolean(currentLicenseNumber && currentAgentId);

  // Fetch agencies when modal opens
  useEffect(() => {
    // Fetch agencies when modal opens (for both new agents and joining scenarios)
    if (isOpen && agencies.length === 0 && !loadingAgencies) {
      fetchAgencies();
    }
    // Cleanup when modal closes
    if (!isOpen && agencies.length > 0) {
      setAgencies([]);
      setSelectedAgency('');
    }
  }, [isOpen]);

  const fetchAgencies = async () => {
    try {
      console.log('🏢 Fetching agencies for selection...');
      setLoadingAgencies(true);
      const response = await getAgencies({ limit: 100 }); // Get all agencies
      console.log(`✅ Fetched ${response.agencies?.length || 0} agencies`);
      setAgencies(response.agencies || []);
    } catch (err) {
      console.error('❌ Failed to fetch agencies:', err);
      setAgencies([]);
    } finally {
      setLoadingAgencies(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    // Validate license number is provided
    if (!licenseNumber.trim()) {
      setError(t('agentLicense.licenseRequired'));
      return;
    }

    // If user selected an agency, require the invitation code
    if (selectedAgency && !agencyInvitationCode.trim()) {
      setError(t('agentLicense.invitationCodeRequired'));
      return;
    }

    // If user entered a code, require agency selection
    if (agencyInvitationCode.trim() && !selectedAgency) {
      setError(t('agentLicense.selectAgencyRequired'));
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      console.log('📤 Submitting agent license with data:', {
        licenseNumber: licenseNumber.trim(),
        agencyInvitationCode: agencyInvitationCode.trim() || '(none)',
        selectedAgency: selectedAgency || '(independent)',
        isJoiningAgency
      });

      await onSubmit({
        licenseNumber: licenseNumber.trim(),
        agencyInvitationCode: agencyInvitationCode.trim() || undefined,
        agentId: agentId.trim() || undefined,
        selectedAgencyId: selectedAgency || undefined,
        languages: languages.length > 0 ? languages : undefined,
      });

      console.log('✅ Agent license verification successful');

      // Reset form and close
      if (!isJoiningAgency) {
        setLicenseNumber('');
        setAgentId('');
      }
      setAgencyInvitationCode('');
      setSelectedAgency('');
      setError('');
      onClose();
    } catch (err) {
      console.error('❌ Agent license verification failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify license. Please check your information and try again.';
      setError(errorMessage);
      // Modal stays open - don't close, don't navigate, just show error
    } finally {
      setIsSubmitting(false);
    }
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
    const selected = agencies.find(a => a._id === agencyId);
    if (selected && selected.invitationCode) {
      // Show a hint about the invitation code format
      setError('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isJoiningAgency ? t('agentLicense.joinAgencyTitle') : t('agentLicense.title')}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            {isJoiningAgency
              ? t('agentLicense.joinAgencyDescription')
              : t('agentLicense.newAgentDescription')}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* License Number */}
            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                {t('agentLicense.licenseNumber')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="licenseNumber"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                disabled={isSubmitting || isJoiningAgency}
                placeholder={t('agentLicense.licenseNumberPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
                readOnly={isJoiningAgency}
              />
              <p className="text-xs text-gray-500 mt-1">
                {isJoiningAgency
                  ? t('agentLicense.verifiedLicense')
                  : t('agentLicense.officialLicense')}
              </p>
            </div>

            {/* Agent ID */}
            <div>
              <label htmlFor="agentId" className="block text-sm font-medium text-gray-700 mb-1">
                {t('agentLicense.agentId')} {!isJoiningAgency && <span className="text-gray-400">({t('agentLicense.optional')})</span>}
              </label>
              <input
                type="text"
                id="agentId"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                disabled={isSubmitting || isJoiningAgency}
                placeholder={t('agentLicense.agentIdPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                readOnly={isJoiningAgency}
              />
              <p className="text-xs text-gray-500 mt-1">
                {isJoiningAgency
                  ? t('agentLicense.verifiedAgentId')
                  : t('agentLicense.autoGeneratedAgentId')}
              </p>
            </div>

            {/* Languages - Only for new agents */}
            {!isJoiningAgency && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agentLicense.languagesSpoken')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {BALKAN_LANGUAGES.map((language) => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => handleLanguageToggle(language)}
                      disabled={isSubmitting}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                        languages.includes(language)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      } disabled:opacity-50`}
                    >
                      {language}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">{t('agentLicense.selectLanguages')}</p>
              </div>
            )}

            {/* Agency Selection - Always shown but optional for new agents */}
            <div>
              <label htmlFor="agencySelect" className="block text-sm font-medium text-gray-700 mb-1">
                {t('agentLicense.selectAgency')} {isJoiningAgency ? <span className="text-red-500">*</span> : <span className="text-gray-400">({t('agentLicense.optional')})</span>}
              </label>
              {loadingAgencies ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                  {t('agentLicense.loadingAgencies')}
                </div>
              ) : (
                <select
                  id="agencySelect"
                  value={selectedAgency}
                  onChange={(e) => handleAgencySelect(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required={isJoiningAgency}
                >
                  <option value="">{isJoiningAgency ? t('agentLicense.selectAnAgency') : t('agentLicense.independentAgent')}</option>
                  {agencies.map((agency) => (
                    <option key={agency._id} value={agency._id}>
                      {agency.name} ({agency.city || 'Location N/A'})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {isJoiningAgency
                  ? t('agentLicense.chooseAgency')
                  : t('agentLicense.selectAgencyOrIndependent')}
              </p>
            </div>

            {/* Agency Invitation Code */}
            <div>
              <label htmlFor="agencyInvitationCode" className="block text-sm font-medium text-gray-700 mb-1">
                {t('agentLicense.invitationCode')} {isJoiningAgency ? <span className="text-red-500">*</span> : <span className="text-gray-400">({t('agentLicense.optional')})</span>}
              </label>
              <input
                type="text"
                id="agencyInvitationCode"
                value={agencyInvitationCode}
                onChange={(e) => setAgencyInvitationCode(e.target.value.toUpperCase())}
                disabled={isSubmitting}
                placeholder={t('agentLicense.invitationCodePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
                required={isJoiningAgency}
              />
              <p className="text-xs text-gray-500 mt-1">
                {isJoiningAgency
                  ? t('agentLicense.enterInvitationCode')
                  : t('agentLicense.leaveEmptyForIndependent')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? (isJoiningAgency ? t('agentLicense.joining') : t('agentLicense.verifying'))
                : (isJoiningAgency ? t('agentLicense.joinAgency') : t('agentLicense.verifyAndBecomeAgent'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentLicenseModal;

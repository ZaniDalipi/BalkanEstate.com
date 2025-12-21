import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
      setError('License number is required');
      return;
    }

    // If user selected an agency, require the invitation code
    if (selectedAgency && !agencyInvitationCode.trim()) {
      setError('Please enter the invitation code for the selected agency');
      return;
    }

    // If user entered a code, require agency selection
    if (agencyInvitationCode.trim() && !selectedAgency) {
      setError('Please select an agency to use the invitation code');
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
            {isJoiningAgency ? 'Join/Change Agency' : 'Agent License Verification'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close license verification modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            {isJoiningAgency
              ? 'Enter your agency invitation code to join. Your license and agent ID are confirmed and cannot be changed.'
              : 'To become an agent, you need to provide your valid real estate license information. You can join an existing agency by entering their invitation code, or register as an independent agent.'}
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
                License Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="licenseNumber"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                disabled={isSubmitting || isJoiningAgency}
                placeholder="e.g., RS-LIC-12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
                readOnly={isJoiningAgency}
              />
              <p className="text-xs text-gray-500 mt-1">
                {isJoiningAgency
                  ? 'Your verified license number (cannot be changed)'
                  : 'Your official real estate license number'}
              </p>
            </div>

            {/* Agent ID */}
            <div>
              <label htmlFor="agentId" className="block text-sm font-medium text-gray-700 mb-1">
                Agent ID {!isJoiningAgency && <span className="text-gray-400">(Optional)</span>}
              </label>
              <input
                type="text"
                id="agentId"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                disabled={isSubmitting || isJoiningAgency}
                placeholder="e.g., AG-12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                readOnly={isJoiningAgency}
              />
              <p className="text-xs text-gray-500 mt-1">
                {isJoiningAgency
                  ? 'Your agent identifier (cannot be changed)'
                  : 'Your unique agent identifier (will be generated if not provided)'}
              </p>
            </div>

            {/* Languages - Only for new agents */}
            {!isJoiningAgency && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Languages Spoken
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
                <p className="text-xs text-gray-500 mt-1.5">Select languages you can communicate in</p>
              </div>
            )}

            {/* Agency Selection - Always shown but optional for new agents */}
            <div>
              <label htmlFor="agencySelect" className="block text-sm font-medium text-gray-700 mb-1">
                Select Agency {isJoiningAgency ? <span className="text-red-500">*</span> : <span className="text-gray-400">(Optional)</span>}
              </label>
              {loadingAgencies ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                  Loading agencies...
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
                  <option value="">{isJoiningAgency ? '-- Select an agency --' : '-- Independent Agent (No Agency) --'}</option>
                  {agencies.map((agency) => (
                    <option key={agency._id} value={agency._id}>
                      {agency.name} ({agency.city || 'Location N/A'})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {isJoiningAgency
                  ? 'Choose the agency you want to join'
                  : 'Select an agency to join, or leave as independent'}
              </p>
            </div>

            {/* Agency Invitation Code */}
            <div>
              <label htmlFor="agencyInvitationCode" className="block text-sm font-medium text-gray-700 mb-1">
                Agency Invitation Code {isJoiningAgency ? <span className="text-red-500">*</span> : <span className="text-gray-400">(Optional)</span>}
              </label>
              <input
                type="text"
                id="agencyInvitationCode"
                value={agencyInvitationCode}
                onChange={(e) => setAgencyInvitationCode(e.target.value.toUpperCase())}
                disabled={isSubmitting}
                placeholder="e.g., AGY-BELGRAD-A1B2C3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
                required={isJoiningAgency}
              />
              <p className="text-xs text-gray-500 mt-1">
                {isJoiningAgency
                  ? 'Enter the invitation code provided by your agency'
                  : 'Leave empty to register as an independent agent'}
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? (isJoiningAgency ? 'Joining...' : 'Verifying...')
                : (isJoiningAgency ? 'Join Agency' : 'Verify & Become Agent')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentLicenseModal;

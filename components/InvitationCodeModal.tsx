import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './shared/Modal';

interface InvitationCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
  agencyName: string;
}

type CodeType = 'invitation' | 'coupon';

// Validation patterns
const INVITATION_CODE_PATTERN = /^AGY-[A-Z0-9]{6}-[A-Z0-9]{6}$/;
const COUPON_CODE_PATTERN = /^IND-[A-Z0-9]{8}$/;

const InvitationCodeModal: React.FC<InvitationCodeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  agencyName,
}) => {
  const { t } = useTranslation(['modals']);
  const [code, setCode] = useState('');
  const [codeType, setCodeType] = useState<CodeType>('coupon');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCode('');
      setError('');
      setValidationMessage(null);
      setCodeType('coupon');
    }
  }, [isOpen]);

  // Auto-detect code type based on input
  const detectCodeType = useCallback((inputCode: string): CodeType => {
    const upperCode = inputCode.toUpperCase();
    if (upperCode.startsWith('AGY-')) {
      return 'invitation';
    }
    return 'coupon';
  }, []);

  // Validate code format
  const validateCode = useCallback((inputCode: string, type: CodeType): { valid: boolean; message: string | null } => {
    if (!inputCode.trim()) {
      return { valid: false, message: null };
    }

    const upperCode = inputCode.toUpperCase();

    if (type === 'invitation') {
      if (upperCode.length > 0 && upperCode.length < 18) {
        return { valid: false, message: 'Keep typing... (AGY-XXXXXX-XXXXXX)' };
      }
      if (upperCode.length >= 18 && !INVITATION_CODE_PATTERN.test(upperCode)) {
        return { valid: false, message: 'Invalid format. Expected: AGY-XXXXXX-XXXXXX' };
      }
      if (INVITATION_CODE_PATTERN.test(upperCode)) {
        return { valid: true, message: 'Valid invitation code format' };
      }
    } else {
      if (upperCode.length > 0 && upperCode.length < 12) {
        return { valid: false, message: 'Keep typing... (IND-XXXXXXXX)' };
      }
      if (upperCode.length >= 12 && !COUPON_CODE_PATTERN.test(upperCode)) {
        return { valid: false, message: 'Invalid format. Expected: IND-XXXXXXXX' };
      }
      if (COUPON_CODE_PATTERN.test(upperCode)) {
        return { valid: true, message: 'Valid coupon code format' };
      }
    }

    return { valid: false, message: null };
  }, []);

  // Handle code input change
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value.toUpperCase();
    setCode(newCode);
    setError('');

    // Auto-detect and switch code type
    const detectedType = detectCodeType(newCode);
    if (newCode.length >= 4 && detectedType !== codeType) {
      setCodeType(detectedType);
    }

    // Validate
    const validation = validateCode(newCode, detectedType);
    setValidationMessage(validation.message);
  }, [codeType, detectCodeType, validateCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedCode) {
      setError('Please enter a code');
      return;
    }

    // Validate format before submitting
    const validation = validateCode(trimmedCode, codeType);
    if (!validation.valid && trimmedCode.length >= (codeType === 'invitation' ? 18 : 12)) {
      setError(validation.message || 'Invalid code format');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(trimmedCode);
      setCode('');
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify code. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return; // Prevent closing while submitting
    setCode('');
    setError('');
    setValidationMessage(null);
    setCodeType('coupon');
    onClose();
  };

  const handleTypeChange = (type: CodeType) => {
    setCodeType(type);
    setCode('');
    setError('');
    setValidationMessage(null);
  };

  // Check if code is valid for submission
  const isCodeValid = code.trim().length >= (codeType === 'invitation' ? 18 : 12);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div className="pt-2 sm:pt-4">
        {/* Header - Mobile responsive */}
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 pr-8">
          Join {agencyName}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          Enter your code to join this agency and get Pro subscription benefits.
        </p>

        {/* Code Type Toggle - Mobile responsive */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-4 sm:mb-6">
          <button
            type="button"
            onClick={() => handleTypeChange('coupon')}
            className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
              codeType === 'coupon'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={isSubmitting}
          >
            <span className="hidden sm:inline">Agent Coupon</span>
            <span className="sm:hidden">Coupon</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('invitation')}
            className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
              codeType === 'invitation'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={isSubmitting}
          >
            <span className="hidden sm:inline">Invitation Code</span>
            <span className="sm:hidden">Invite</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="codeInput" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              {codeType === 'invitation' ? 'Invitation Code' : 'Agent Registration Code'}
            </label>
            <input
              type="text"
              id="codeInput"
              value={code}
              onChange={handleCodeChange}
              placeholder={codeType === 'invitation' ? 'AGY-XXXXXX-XXXXXX' : 'IND-XXXXXXXX'}
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-base sm:text-lg tracking-wider uppercase transition-colors ${
                error ? 'border-red-300 bg-red-50' :
                validationMessage?.includes('Valid') ? 'border-green-300 bg-green-50' :
                'border-gray-300'
              }`}
              disabled={isSubmitting}
              maxLength={codeType === 'invitation' ? 18 : 12}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />

            {/* Validation/Format hint - Mobile responsive */}
            <div className="mt-1.5 sm:mt-2 min-h-[20px]">
              {validationMessage ? (
                <p className={`text-xs sm:text-sm ${
                  validationMessage.includes('Valid') ? 'text-green-600' :
                  validationMessage.includes('Keep typing') ? 'text-gray-500' :
                  'text-amber-600'
                }`}>
                  {validationMessage}
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  {codeType === 'invitation'
                    ? 'Format: AGY-XXXXXX-XXXXXX'
                    : 'Format: IND-XXXXXXXX'}
                </p>
              )}
            </div>
          </div>

          {/* Info box based on code type - Mobile responsive */}
          <div className={`p-3 sm:p-4 rounded-lg ${
            codeType === 'invitation'
              ? 'bg-blue-50 border border-blue-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <p className={`text-xs sm:text-sm ${
              codeType === 'invitation' ? 'text-blue-700' : 'text-amber-700'
            }`}>
              {codeType === 'invitation'
                ? 'The invitation code lets you request to join the agency. The admin will review your request.'
                : 'The agent coupon gives you instant Pro subscription (25 listings/year) as part of this agency.'}
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 animate-shake">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions - Mobile responsive */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting || !code.trim()}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verifying...</span>
                </>
              ) : (
                <span>{codeType === 'invitation' ? 'Submit Request' : 'Redeem Coupon'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default InvitationCodeModal;

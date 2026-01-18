import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './shared/Modal';

interface InvitationCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
  agencyName: string;
}

type CodeType = 'invitation' | 'coupon';

const InvitationCodeModal: React.FC<InvitationCodeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  agencyName,
}) => {
  const { t } = useTranslation(['modals']);
  const [code, setCode] = useState('');
  const [codeType, setCodeType] = useState<CodeType>('invitation');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError(t('invitationCode.enterCode'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(code.trim().toUpperCase());
      setCode('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invitationCode.verifyFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError('');
    setCodeType('invitation');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="pt-4">
        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2 pr-8">Join {agencyName}</h2>
        <p className="text-gray-600 mb-6">
          Enter your code to join this agency and get Pro subscription benefits.
        </p>

        {/* Code Type Toggle */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setCodeType('invitation'); setCode(''); setError(''); }}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              codeType === 'invitation'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Invitation Code
          </button>
          <button
            type="button"
            onClick={() => { setCodeType('coupon'); setCode(''); setError(''); }}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              codeType === 'coupon'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Agent Coupon
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="codeInput" className="block text-sm font-medium text-gray-700 mb-2">
              {codeType === 'invitation' ? 'Invitation Code' : 'Agent Registration Code'}
            </label>
            <input
              type="text"
              id="codeInput"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder={codeType === 'invitation' ? 'AGY-XXXXXX-XXXXXX' : 'IND-XXXXXXXX'}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-lg tracking-wider uppercase"
              disabled={isSubmitting}
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-2">
              {codeType === 'invitation'
                ? 'Format: AGY-XXXXXX-XXXXXX (from agency admin)'
                : 'Format: IND-XXXXXXXX (agent subscription coupon)'}
            </p>
          </div>

          {/* Info box based on code type */}
          <div className={`p-3 rounded-lg ${codeType === 'invitation' ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className={`text-sm ${codeType === 'invitation' ? 'text-blue-700' : 'text-amber-700'}`}>
              {codeType === 'invitation'
                ? 'The invitation code lets you request to join the agency. The admin will review your request.'
                : 'The agent coupon gives you instant Pro subscription (25 listings/year) as part of this agency.'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !code.trim()}
            >
              {isSubmitting ? 'Verifying...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default InvitationCodeModal;

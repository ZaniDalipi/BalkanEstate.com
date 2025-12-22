import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './shared/Modal';
import { XMarkIcon } from '../constants';

interface InvitationCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
  agencyName: string;
}

const InvitationCodeModal: React.FC<InvitationCodeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  agencyName,
}) => {
  const { t } = useTranslation(['modals']);
  const [code, setCode] = useState('');
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
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{t('invitationCode.title')}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={t('common.close')}
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <p className="text-gray-600 mb-4">
              {t('invitationCode.description', { agencyName })}
            </p>

            <div>
              <label htmlFor="invitationCode" className="block text-sm font-medium text-gray-700 mb-2">
                {t('invitationCode.label')}
              </label>
              <input
                type="text"
                id="invitationCode"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder={t('invitationCode.placeholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-lg tracking-wider uppercase"
                disabled={isSubmitting}
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-2">
                {t('invitationCode.formatHint')}
              </p>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !code.trim()}
            >
              {isSubmitting ? t('invitationCode.verifying') : t('invitationCode.submit')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default InvitationCodeModal;

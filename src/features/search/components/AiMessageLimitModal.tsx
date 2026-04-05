import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/shared/Modal';
import { useAppContext } from '@/context/AppContext';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import { UserRole } from '@/types';

interface AiMessageLimitInfo {
  limit: number;
  used: number;
  remaining: number;
  resetDate: string;
}

interface AiMessageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitInfo: AiMessageLimitInfo | null;
}

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const ArrowRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const AiMessageLimitModal: React.FC<AiMessageLimitModalProps> = ({
  isOpen,
  onClose,
  limitInfo,
}) => {
  const { t } = useTranslation(['search', 'modals']);
  const { state, dispatch } = useAppContext();
  const { getLocalizedPath } = useLocalizedNavigation();

  const userRole = state.currentUser?.role;
  const isSeller = userRole === UserRole.PRIVATE_SELLER || userRole === UserRole.AGENT;

  const resetDateFormatted = limitInfo?.resetDate
    ? new Date(limitInfo.resetDate).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      })
    : '';

  const handleUpgrade = () => {
    onClose();
    setTimeout(() => {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
      window.history.pushState({ view: 'pricing' }, '', getLocalizedPath('/subscribe'));
    }, 150);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center p-4 sm:p-6">
        {/* Animated icon */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full opacity-20 animate-pulse" />
          <div className="absolute inset-2 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center">
            <SparklesIcon className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-neutral-800 mb-3">
          {t('search:ai.limitReached.title')}
        </h3>

        {/* Message */}
        <p className="text-neutral-600 mb-2">
          {t('search:ai.limitReached.message', { limit: limitInfo?.limit ?? 0 })}
        </p>

        {/* Reset date info */}
        {resetDateFormatted && (
          <p className="text-sm text-neutral-500 mb-6">
            {t('search:ai.limitReached.resetsOn', { date: resetDateFormatted })}
          </p>
        )}

        {/* Upgrade benefits */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-200 rounded-xl p-4 mb-6 text-left">
          <p className="font-bold text-violet-800 text-base mb-3">
            {isSeller
              ? t('search:ai.limitReached.upgradeToSellerPro')
              : t('search:ai.limitReached.upgradeToBuyerPro')}
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-violet-700">
              <svg className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('search:ai.limitReached.benefit1')}
            </li>
            <li className="flex items-start gap-2 text-sm text-violet-700">
              <svg className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isSeller
                ? t('search:ai.limitReached.sellerBenefit2')
                : t('search:ai.limitReached.buyerBenefit2')}
            </li>
            <li className="flex items-start gap-2 text-sm text-violet-700">
              <svg className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isSeller
                ? t('search:ai.limitReached.sellerBenefit3')
                : t('search:ai.limitReached.buyerBenefit3')}
            </li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleUpgrade}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-lg shadow-lg hover:from-violet-600 hover:to-purple-600 transition-all transform hover:scale-105"
          >
            {isSeller
              ? t('search:ai.limitReached.viewSellerPlans')
              : t('search:ai.limitReached.viewBuyerPlans')}
            <ArrowRightIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
          >
            {t('modals:common.maybeLater')}
          </button>
        </div>

        {/* Reset note */}
        <p className="text-xs text-neutral-500 mt-4">
          {t('search:ai.limitReached.freeNote', { limit: limitInfo?.limit ?? 0 })}
        </p>
      </div>
    </Modal>
  );
};

export default AiMessageLimitModal;

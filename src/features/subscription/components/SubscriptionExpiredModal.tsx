import React from 'react';
import { useSubscriptionExpiredModal } from '../hooks/useSubscriptionExpiredModal';

const SELLER_LOST_FEATURES = [
  'Increased property listing limits',
  'Monthly promotion coupons',
  'AI messages & market insights',
  'Priority notifications',
];

const BUYER_LOST_FEATURES = [
  'Instant property match notifications',
  'Unlimited saved searches',
  'Early access to new listings',
  'Advanced market insights',
];

const SubscriptionExpiredModal: React.FC = () => {
  const {
    isVisible,
    phase,
    planName,
    expiredAt,
    isBuyer,
    handleReactivate,
    handleMaybeLater,
    handleNo,
  } = useSubscriptionExpiredModal();

  if (!isVisible) return null;

  const lostFeatures = isBuyer ? BUYER_LOST_FEATURES : SELLER_LOST_FEATURES;
  const isFinalPhase = phase === 3;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop — no click-to-dismiss; user must choose an action */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-sub-expired">

        {/* ── Red header ── */}
        <div className="bg-gradient-to-b from-red-500 to-red-600 px-6 pt-8 pb-8 flex flex-col items-center text-white">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-yellow-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-center">Your Subscription Has Expired</h2>
          <p className="text-white/80 text-sm mt-1 text-center">
            Your account has been downgraded to the free plan
          </p>
        </div>

        {/* ── Body ── */}
        <div className="px-6 pt-5 pb-6">

          {/* Expiry description */}
          <p className="text-neutral-700 text-sm mb-4">
            Your <strong>{planName}</strong> subscription
            {expiredAt ? (
              <> expired on <strong>{expiredAt}</strong>.</>
            ) : (
              <> has expired.</>
            )}{' '}
            Reactivate now to instantly restore all your premium features.
          </p>

          {/* Lost features */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
            <p className="text-red-700 font-semibold text-sm mb-2">You no longer have access to:</p>
            <ul className="space-y-1.5">
              {lostFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-red-600 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={isFinalPhase ? handleNo : handleMaybeLater}
              className="flex-1 py-3 px-4 border-2 border-neutral-200 text-neutral-600 font-semibold rounded-full hover:border-neutral-300 hover:bg-neutral-50 transition-colors text-sm"
            >
              {isFinalPhase ? 'No' : 'Maybe later'}
            </button>
            <button
              onClick={handleReactivate}
              className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-colors text-sm"
            >
              Reactivate Plan →
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sub-expired-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .animate-sub-expired {
          animation: sub-expired-in 0.25s ease-out both;
        }
      `}</style>
    </div>
  );
};

export default SubscriptionExpiredModal;

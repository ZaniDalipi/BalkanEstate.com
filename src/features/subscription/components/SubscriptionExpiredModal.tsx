import React, { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';

const STORAGE_KEY_PREFIX = 'be_sub_expired_';

interface DismissalState {
  count: number; // 0 = never shown, 1 = shown once (Maybe Later clicked), 2+ = permanent
  dismissedAt: number | null;
  permanent: boolean;
}

function getDismissalState(userId: string): DismissalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (!raw) return { count: 0, dismissedAt: null, permanent: false };
    return JSON.parse(raw);
  } catch {
    return { count: 0, dismissedAt: null, permanent: false };
  }
}

function saveDismissalState(userId: string, state: DismissalState) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(state));
  } catch {}
}

function formatPlanName(plan?: string): string {
  if (!plan) return 'pro';
  return plan.replace(/_/g, ' ');
}

function formatDate(date?: Date | string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SELLER_PRO_LOST_FEATURES = [
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
  const { state, dispatch } = useAppContext();
  const { getLocalizedPath } = useLocalizedNavigation();
  const [visible, setVisible] = useState(false);
  const [isSecondShow, setIsSecondShow] = useState(false);

  const user = state.currentUser;
  const subscription = user?.subscription;

  useEffect(() => {
    if (!user || !subscription) {
      setVisible(false);
      return;
    }

    if (subscription.status !== 'expired') {
      setVisible(false);
      return;
    }

    const dismissal = getDismissalState(user.id || user._id || user.email || '');

    if (dismissal.permanent) {
      setVisible(false);
      return;
    }

    if (dismissal.count >= 1 && dismissal.dismissedAt) {
      const hoursSince = (Date.now() - dismissal.dismissedAt) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        setVisible(false);
        return;
      }
      // Second show
      setIsSecondShow(true);
    } else {
      setIsSecondShow(false);
    }

    setVisible(true);
  }, [user, subscription]);

  if (!visible || !user || !subscription) return null;

  const userId = user.id || user._id || user.email || '';
  const planName = formatPlanName(subscription.plan);
  const expiredAt = formatDate(subscription.expiresAt);
  const isBuyer = subscription.tier === 'buyer';
  const lostFeatures = isBuyer ? BUYER_LOST_FEATURES : SELLER_PRO_LOST_FEATURES;

  const handleReactivate = () => {
    setVisible(false);
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
    window.history.pushState({ view: 'pricing' }, '', getLocalizedPath('/pricing'));
  };

  const handleMaybeLater = () => {
    const current = getDismissalState(userId);
    saveDismissalState(userId, {
      count: current.count + 1,
      dismissedAt: Date.now(),
      permanent: false,
    });
    setVisible(false);
  };

  const handleNo = () => {
    saveDismissalState(userId, {
      count: 2,
      dismissedAt: Date.now(),
      permanent: true,
    });
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
        {/* Red header */}
        <div className="bg-gradient-to-b from-red-500 to-red-600 px-6 pt-8 pb-8 flex flex-col items-center text-white">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-yellow-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-center">Your Subscription Has Expired</h2>
          <p className="text-white/80 text-sm mt-1 text-center">Your account has been downgraded to the free plan</p>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-6">
          <p className="text-neutral-700 text-sm mb-4">
            Your <strong>{planName}</strong> subscription expired on{' '}
            <strong>{expiredAt}</strong>. Reactivate now to instantly restore all your premium features.
          </p>

          {/* Lost features */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
            <p className="text-red-700 font-semibold text-sm mb-2">You no longer have access to:</p>
            <ul className="space-y-1.5">
              {lostFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-red-600 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={isSecondShow ? handleNo : handleMaybeLater}
              className="flex-1 py-3 px-4 border-2 border-neutral-200 text-neutral-600 font-semibold rounded-full hover:border-neutral-300 hover:bg-neutral-50 transition-colors text-sm"
            >
              {isSecondShow ? 'No' : 'Maybe later'}
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
        @keyframes sub-expired-fade-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in {
          animation: sub-expired-fade-in 0.25s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SubscriptionExpiredModal;

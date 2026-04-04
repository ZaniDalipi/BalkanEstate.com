import React, { useState, useCallback } from 'react';
import PaymentWindow from '../../../../components/shared/PaymentWindow';
import { useAppContext } from '../../../../context/AppContext';
import { API_URL } from '../../../shared/api/config';
import { tokenService } from '../../../shared/api/tokenService';
import {
  ExpiryCheckResult,
  hasUserDismissedWarning,
  markWarningDismissed,
} from '../hooks/useSubscriptionExpiry';

interface Props {
  expiryInfo: ExpiryCheckResult;
  /** Phase 1 / 2 / 3 to show, or null (nothing to show). Owned by App-level hook. */
  expiredPhase: 1 | 2 | 3 | null;
  onDismissWarning: () => void;
  /** "Maybe later" or "Reactivate Plan" without completing payment */
  onDismissExpired: () => void;
  /** "No thanks" — phase 3 permanent dismissal */
  onDismissExpiredFinal: () => void;
  /** Payment completed successfully */
  onPaymentSuccess: () => void;
}

interface ProductInfo {
  name: string;
  price: number;
  interval: 'month' | 'year';
  productId: string;
}

const SubscriptionExpiryModals: React.FC<Props> = ({
  expiryInfo,
  expiredPhase,
  onDismissWarning,
  onDismissExpired,
  onDismissExpiredFinal,
  onPaymentSuccess,
}) => {
  const { state } = useAppContext();
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  const user = state.currentUser;
  const userRole: 'buyer' | 'private_seller' | 'agent' =
    user?.role === 'agent' ? 'agent' : user?.role === 'buyer' ? 'buyer' : 'private_seller';

  // ── Fetch product details then open PaymentWindow ─────────────────────────

  const fetchProductAndOpenPayment = useCallback(async () => {
    if (!expiryInfo.productId) return;
    // Count as dismissed so the modal won't reappear on the next login while
    // the user is deciding whether to complete payment.
    onDismissExpired();
    setLoadingProduct(true);
    try {
      const token = tokenService.getAccessToken();
      const roles = ['seller', 'buyer', 'agent'];
      let found: ProductInfo | null = null;
      for (const role of roles) {
        const res = await fetch(`${API_URL}/products?role=${role}`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) continue;
        const data = await res.json();
        const products: any[] = data.products || [];
        const match = products.find((p: any) => p.productId === expiryInfo.productId);
        if (match) {
          found = {
            name: match.name,
            price: match.price,
            interval: match.billingPeriod === 'yearly' ? 'year' : 'month',
            productId: match.productId,
          };
          break;
        }
      }
      if (!found) {
        const isYearly = expiryInfo.productId.includes('yearly') || expiryInfo.productId.includes('annual');
        found = {
          name: expiryInfo.productId.replace(/_/g, ' '),
          price: 0,
          interval: isYearly ? 'year' : 'month',
          productId: expiryInfo.productId,
        };
      }
      setProductInfo(found);
      setShowPaymentWindow(true);
    } catch {
      window.location.href = '/account';
    } finally {
      setLoadingProduct(false);
    }
  }, [expiryInfo.productId, onDismissExpired]);

  const handlePaymentSuccess = useCallback(() => {
    setShowPaymentWindow(false);
    onPaymentSuccess();
    window.dispatchEvent(new Event('subscriptionUpdated'));
  }, [onPaymentSuccess]);

  // ── Derived visibility ────────────────────────────────────────────────────

  if (!expiryInfo.hasSubscription) return null;

  const showExpiringSoon =
    expiryInfo.isExpiringSoon &&
    !expiryInfo.isExpired &&
    !hasUserDismissedWarning(expiryInfo.expirationDate);

  const showExpired = expiryInfo.isExpired && expiredPhase !== null;
  const isFinalPhase = expiredPhase === 3;

  const handleDismissWarning = () => {
    markWarningDismissed(expiryInfo.expirationDate);
    onDismissWarning();
  };

  const expiryDate = new Date(expiryInfo.expirationDate);
  const expiryStr = expiryDate.toLocaleString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const hoursLeft = Math.max(0, Math.ceil(expiryInfo.hoursUntilExpiry));

  return (
    <>
      {/* ── Expiring Soon Warning Modal ── */}
      {showExpiringSoon && !showExpired && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleDismissWarning}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 text-3xl mb-3">⏰</div>
              <h2 className="text-xl font-bold text-white">Subscription Expiring Soon</h2>
              <p className="text-amber-100 text-sm mt-1">
                Less than {hoursLeft} hour{hoursLeft !== 1 ? 's' : ''} remaining
              </p>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
                Your <span className="font-semibold">{expiryInfo.productId.replace(/_/g, ' ')}</span>{' '}
                subscription expires on <span className="font-semibold">{expiryStr}</span>. After
                that, your account will be downgraded to the free plan.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-5 text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-2">You'll lose access to:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Increased property listing limits</li>
                  <li>Monthly promotion coupons</li>
                  <li>AI messages &amp; market insights</li>
                  <li>Priority notifications</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDismissWarning}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Remind me later
                </button>
                <button
                  onClick={fetchProductAndOpenPayment}
                  disabled={loadingProduct}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-md disabled:opacity-70"
                >
                  {loadingProduct ? 'Loading…' : 'Renew Now →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Subscription Expired Modal ── */}
      {showExpired && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-5 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 text-3xl mb-3">⚡</div>
              <h2 className="text-xl font-bold text-white">Your Subscription Has Expired</h2>
              <p className="text-red-100 text-sm mt-1">Your account has been downgraded to the free plan</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
                Your{' '}
                <span className="font-semibold">{expiryInfo.productId.replace(/_/g, ' ')}</span>{' '}
                subscription expired on <span className="font-semibold">{expiryStr}</span>. Reactivate
                now to instantly restore all your premium features.
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-5 text-sm text-red-700 dark:text-red-300">
                <p className="font-semibold mb-2">You no longer have access to:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Increased property listing limits</li>
                  <li>Monthly promotion coupons</li>
                  <li>AI messages &amp; market insights</li>
                  <li>Priority notifications</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={isFinalPhase ? onDismissExpiredFinal : onDismissExpired}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {isFinalPhase ? 'No, thanks' : 'Maybe later'}
                </button>
                <button
                  onClick={fetchProductAndOpenPayment}
                  disabled={loadingProduct}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-semibold hover:from-red-600 hover:to-rose-700 transition-all shadow-md disabled:opacity-70"
                >
                  {loadingProduct ? 'Loading…' : 'Reactivate Plan →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Window ── */}
      {productInfo && (
        <PaymentWindow
          isOpen={showPaymentWindow}
          onClose={() => setShowPaymentWindow(false)}
          planName={productInfo.name}
          planPrice={productInfo.price}
          planInterval={productInfo.interval}
          userRole={userRole}
          userEmail={user?.email}
          productId={productInfo.productId}
          onSuccess={handlePaymentSuccess}
          onError={() => setShowPaymentWindow(false)}
        />
      )}
    </>
  );
};

export default SubscriptionExpiryModals;

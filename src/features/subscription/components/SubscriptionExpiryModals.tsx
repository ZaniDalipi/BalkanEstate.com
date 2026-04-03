import React, { useState, useCallback, useRef } from 'react';
import PaymentWindow from '../../../../components/shared/PaymentWindow';
import { useAppContext } from '../../../../context/AppContext';
import { API_URL } from '../../../shared/api/config';
import { tokenService } from '../../../shared/api/tokenService';
import {
  ExpiryCheckResult,
  hasUserDismissedWarning,
  markWarningDismissed,
} from '../hooks/useSubscriptionExpiry';

// ─── Persistent show counter ─────────────────────────────────────────────────
//
// Tracks how many times the expired subscription modal has been shown+dismissed.
// Read synchronously during render (no useEffect) so the value is always fresh
// regardless of component remounts, auth re-checks, or prop reference changes.
//
// Schedule:
//   Show 1 — Day 0+  (first login after expiry)
//   Show 2 — Day 3+  (3 days after expiry, if show 1 was dismissed)
//   Show 3 — Day 7+  (7 days after expiry, if show 2 was dismissed, final "No thanks")
//   After 3 — never again

const STORAGE_KEY = 'be_sub_exp_v3_';
const MS_PER_DAY = 86_400_000;

function getStorageKey(userId: string): string { return STORAGE_KEY + userId; }

function readShowCount(userId: string): number {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return 0;
    const n = JSON.parse(raw)?.c;
    return typeof n === 'number' && n >= 0 ? n : 0;
  } catch { return 0; }
}

function writeShowCount(userId: string, n: number): void {
  try { localStorage.setItem(getStorageKey(userId), JSON.stringify({ c: n })); } catch {}
}

function deleteShowCount(userId: string): void {
  try { localStorage.removeItem(getStorageKey(userId)); } catch {}
}

function daysSinceExpiry(expirationDate: string): number {
  const ms = Date.now() - new Date(expirationDate).getTime();
  return ms < 0 ? 0 : Math.floor(ms / MS_PER_DAY);
}

/**
 * Determines which phase (1/2/3) to show, or null if nothing should appear.
 */
function resolvePhase(showCount: number, days: number): 1 | 2 | 3 | null {
  if (showCount >= 3) return null;           // all 3 shows done — never again
  if (showCount === 0) return 1;             // first show: Day 0+
  if (showCount === 1 && days >= 3) return 2; // second show: Day 3+
  if (showCount === 2 && days >= 7) return 3; // third show: Day 7+
  return null;                               // waiting for next day threshold
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  expiryInfo: ExpiryCheckResult | null;
  onDismissWarning: () => void;
}

interface ProductInfo {
  name: string;
  price: number;
  interval: 'month' | 'year';
  productId: string;
}

const SubscriptionExpiryModals: React.FC<Props> = ({ expiryInfo, onDismissWarning }) => {
  const { state } = useAppContext();
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // Force re-render counter — bumped after writing to localStorage so React
  // re-reads the new value on the next render.
  const [, bump] = useState(0);

  const user = state.currentUser;
  const userId = user?.id || user?._id || user?.email || '';
  const userRole: 'buyer' | 'private_seller' | 'agent' =
    user?.role === 'agent' ? 'agent' : user?.role === 'buyer' ? 'buyer' : 'private_seller';

  // ── Session guard ─────────────────────────────────────────────────────────
  // Set synchronously on any dismiss action. Survives every re-render within
  // the same page load. Only resets when the page is fully reloaded.
  const dismissedRef = useRef(false);

  // ── Compute phase synchronously from localStorage ─────────────────────────
  // No useEffect, no useState for the phase — read directly from localStorage
  // on every render. localStorage reads are synchronous and < 1ms.
  let expiredPhase: 1 | 2 | 3 | null = null;

  if (
    !dismissedRef.current &&
    expiryInfo?.isExpired &&
    userId &&
    expiryInfo.expirationDate
  ) {
    const count = readShowCount(userId);
    const days = daysSinceExpiry(expiryInfo.expirationDate);
    expiredPhase = resolvePhase(count, days);
  }

  // ── Dismiss actions ───────────────────────────────────────────────────────

  /** "Maybe later" or "Reactivate Plan" — advance show counter by 1 */
  const dismiss = useCallback(() => {
    if (!userId) return;
    dismissedRef.current = true;
    const n = readShowCount(userId);
    writeShowCount(userId, n + 1);
    bump(c => c + 1);
  }, [userId]);

  /** "No thanks" (phase 3) — mark as permanently done */
  const dismissPermanently = useCallback(() => {
    if (!userId) return;
    dismissedRef.current = true;
    writeShowCount(userId, 3);
    bump(c => c + 1);
  }, [userId]);

  // ── Fetch product & open PaymentWindow ────────────────────────────────────

  const fetchProductAndOpenPayment = useCallback(async () => {
    if (!expiryInfo?.productId) return;
    // Count this as a show so the modal won't reappear on the next login
    dismiss();
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
  }, [expiryInfo?.productId, dismiss]);

  const handlePaymentSuccess = useCallback(() => {
    setShowPaymentWindow(false);
    if (userId) deleteShowCount(userId);
    dismissedRef.current = true;
    bump(c => c + 1);
    window.dispatchEvent(new Event('subscriptionUpdated'));
  }, [userId]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!expiryInfo?.hasSubscription) return null;

  const showExpiringSoon =
    expiryInfo.isExpiringSoon &&
    !expiryInfo.isExpired &&
    !hasUserDismissedWarning(expiryInfo.expirationDate);

  const showExpired = expiredPhase !== null;
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
                  onClick={isFinalPhase ? dismissPermanently : dismiss}
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

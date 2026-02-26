import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  TicketIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  XMarkIcon,
} from '../../constants';
import { API_URL } from '../../src/shared/api/config';

interface RedemptionResult {
  message: string;
  subscription: {
    tier: string;
    status: string;
    listingsLimit: number;
    expiresAt: string;
  };
  agency: {
    id: string;
    name: string;
    role: string;
  };
}

interface AgencyCouponRedemptionProps {
  onSuccess?: (result: RedemptionResult) => void;
  onClose?: () => void;
  showAsModal?: boolean;
}

const AgencyCouponRedemption: React.FC<AgencyCouponRedemptionProps> = ({
  onSuccess,
  onClose,
  showAsModal = false,
}) => {
  const { state, dispatch } = useAppContext();
  const { t } = useTranslation(['agencies', 'common']);
  const [couponCode, setCouponCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<RedemptionResult | null>(null);

  // Check if user is an agent (database is source of truth)
  const isUserAgent = (): boolean => {
    const user = state.currentUser;
    if (!user) return false;
    return (
      user.availableRoles?.includes(UserRole.AGENT) ||
      user.role === UserRole.AGENT ||
      !!user.agentId ||
      !!user.licenseNumber
    );
  };

  // Check if user already belongs to an agency
  const userHasAgency = (): boolean => {
    const user = state.currentUser;
    return !!user?.agencyId;
  };

  // Check if user already has a Pro/Enterprise subscription
  const hasExistingSubscription = (): boolean => {
    const user = state.currentUser;
    if (!user) return false;
    const tier = user.subscription?.tier || user.subscriptionPlan?.toLowerCase();
    return tier === 'pro' || tier === 'enterprise' || tier === 'agency_owner' || tier === 'agency_agent';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate coupon code format
    const trimmedCode = couponCode.trim().toUpperCase();
    if (!trimmedCode) {
      setError(t('agencies:coupon.errors.enterCode', 'Please enter a coupon code'));
      return;
    }

    // Validate user is authenticated
    if (!state.currentUser) {
      setError(t('agencies:coupon.errors.loginRequired', 'You must be logged in to redeem a coupon'));
      return;
    }

    // Validate user is an agent
    if (!isUserAgent()) {
      setError(t('agencies:coupon.errors.agentRequired', 'Only registered agents can redeem agency coupons. Please register as an agent first in your profile settings.'));
      return;
    }

    // Warning if user already has an agency (they'll be moved)
    if (userHasAgency()) {
      const confirmMove = window.confirm(
        t('agencies:coupon.confirmMove', 'You are already a member of an agency. Redeeming this coupon will move you to the new agency. Continue?')
      );
      if (!confirmMove) return;
    }

    setIsRedeeming(true);

    try {
      const response = await fetch(`${API_URL}/agencies/coupons/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ couponCode: trimmedCode }),
      });

      if (!response.ok) {
        // Handle specific error codes from backend
        const errorData = await response.json().catch(() => null);
        switch (errorData?.code) {
          case 'INVALID_COUPON':
            setError(t('agencies:coupon.errors.invalidCoupon', 'Invalid coupon code. Please check the code and try again.'));
            break;
          case 'COUPON_ALREADY_USED':
            setError(t('agencies:coupon.errors.alreadyUsed', 'This coupon has already been used by another agent.'));
            break;
          case 'COUPON_EXPIRED':
            setError(t('agencies:coupon.errors.expired', 'This coupon has expired and can no longer be redeemed.'));
            break;
          case 'COUPON_NOT_FOUND':
            setError(t('agencies:coupon.errors.notFound', 'Coupon not found. Please verify the code is correct.'));
            break;
          case 'AGENCY_SUBSCRIPTION_INACTIVE':
            setError(t('agencies:coupon.errors.subscriptionInactive', 'The agency subscription is no longer active. This coupon cannot be redeemed.'));
            break;
          case 'MISSING_COUPON_CODE':
            setError(t('agencies:coupon.errors.missingCode', 'Please enter a coupon code.'));
            break;
          default:
            setError(errorData?.message || t('agencies:coupon.errors.redeemFailed', 'Failed to redeem coupon. Please try again.'));
        }
        return;
      }

      const data = await response.json();

      // Success! Update user context
      setSuccess(data);

      // Update the app context with new user data
      if (data.subscription && data.agency) {
        dispatch({
          type: 'UPDATE_USER',
          payload: {
            subscription: {
              ...state.currentUser?.subscription,
              tier: data.subscription.tier,
              status: data.subscription.status,
              listingsLimit: data.subscription.listingsLimit,
              expiresAt: data.subscription.expiresAt,
            },
            agencyId: data.agency.id,
            agencyName: data.agency.name,
          },
        });

        // Show success alert
        dispatch({
          type: 'SHOW_ALERT',
          payload: {
            type: 'success',
            title: t('agencies:coupon.success.title', 'Coupon Redeemed!'),
            message: t('agencies:coupon.success.message', "You've successfully joined {{name}} with a Pro subscription!", { name: data.agency.name }),
          },
        });
      }

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err: any) {
      setError(t('common:errors.networkError', 'Network error. Please check your connection and try again.'));
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleReset = () => {
    setCouponCode('');
    setError(null);
    setSuccess(null);
  };

  // If user is not an agent, show a message to register first
  if (!isUserAgent()) {
    return (
      <div className={`${showAsModal ? 'p-6' : 'p-4 bg-white rounded-xl border border-neutral-200'}`}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-neutral-800 mb-2">{t('agencies:coupon.agentRequired.title', 'Agent Registration Required')}</h3>
            <p className="text-sm text-neutral-600 mb-4">
              {t('agencies:coupon.agentRequired.description', 'To redeem an agency coupon and join an agency, you must first register as an agent. This requires providing your license number and professional details.')}
            </p>
            <button
              onClick={() => {
                dispatch({ type: 'SET_ACCOUNT_TAB', payload: 'profile' });
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
                if (onClose) onClose();
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              {t('agencies:coupon.agentRequired.goToProfile', 'Go to Profile Settings')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className={`${showAsModal ? 'p-6' : 'p-4 bg-white rounded-xl border border-neutral-200'}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-neutral-800 mb-2">{t('agencies:coupon.success.welcome', 'Welcome to {{name}}!', { name: success.agency.name })}</h3>
          <p className="text-sm text-neutral-600 mb-6">
            {t('agencies:coupon.success.joined', "You've successfully joined the agency with a Pro subscription.")}
          </p>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
            <h4 className="font-semibold text-green-800 mb-3">{t('agencies:coupon.success.benefits', 'Your Benefits:')}</h4>
            <ul className="space-y-2 text-sm text-green-700">
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4" />
                <span>{t('agencies:coupon.success.listingsLimit', 'Up to {{limit}} active listings', { limit: success.subscription.listingsLimit })}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4" />
                <span>{t('agencies:coupon.success.branding', 'Agency branding on your listings')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4" />
                <span>{t('agencies:coupon.success.promotionAccess', 'Access to agency promotion coupons')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4" />
                <span>
                  {t('agencies:coupon.success.validUntil', 'Subscription valid until {{date}}', { date: new Date(success.subscription.expiresAt).toLocaleDateString() })}
                </span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                dispatch({ type: 'SET_SELECTED_AGENCY', payload: success.agency.id });
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
                window.history.pushState({}, '', `/agencies/${success.agency.id}`);
                if (onClose) onClose();
              }}
              className="px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
            >
              <BuildingOfficeIcon className="w-4 h-4" />
              {t('agencies:coupon.success.viewAgency', 'View Agency')}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 text-sm font-semibold rounded-lg hover:bg-neutral-50 transition-all"
              >
                {t('common:close', 'Close')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className={`${showAsModal ? 'p-6' : 'p-4 bg-white rounded-xl border border-neutral-200'}`}>
      {showAsModal && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      )}

      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center flex-shrink-0">
          <TicketIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-neutral-800">{t('agencies:coupon.title', 'Redeem Agency Coupon')}</h3>
          <p className="text-sm text-neutral-600">
            {t('agencies:coupon.description', 'Enter the coupon code you received to join an agency and get a Pro subscription.')}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 font-medium">{t('agencies:coupon.errors.redemptionFailed', 'Redemption Failed')}</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {userHasAgency() && !error && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">
            <strong>{t('agencies:coupon.note', 'Note:')}</strong> {t('agencies:coupon.alreadyInAgency', 'You\'re already a member of {{name}}. Redeeming a new coupon will move you to the new agency.', { name: state.currentUser?.agencyName || t('agencies:coupon.anAgency', 'an agency') })}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="couponCode" className="block text-sm font-semibold text-neutral-700 mb-2">
            {t('agencies:coupon.codeLabel', 'Coupon Code')}
          </label>
          <input
            type="text"
            id="couponCode"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder={t('agencies:coupon.codePlaceholder', 'Enter your coupon code (e.g., AGENCY-XXXXXXXX)')}
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm font-mono uppercase tracking-wider"
            disabled={isRedeeming}
            autoComplete="off"
            autoFocus
          />
          <p className="text-xs text-neutral-500 mt-1">
            {t('agencies:coupon.codeFormat', 'The code should be in the format: AGENCY-XXXXXXXX')}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isRedeeming || !couponCode.trim()}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isRedeeming ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{t('agencies:coupon.redeeming', 'Redeeming...')}</span>
              </>
            ) : (
              <>
                <TicketIcon className="w-5 h-5" />
                <span>{t('agencies:coupon.redeemButton', 'Redeem Coupon')}</span>
              </>
            )}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={isRedeeming}
              className="px-4 py-3 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-50 transition-all disabled:opacity-50"
            >
              {t('common:cancel', 'Cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 pt-4 border-t border-neutral-200">
        <h4 className="text-sm font-semibold text-neutral-700 mb-2">{t('agencies:coupon.whatHappens.title', 'What happens when you redeem?')}</h4>
        <ul className="space-y-1 text-xs text-neutral-600">
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
            <span>{t('agencies:coupon.whatHappens.addedToTeam', "You'll be added to the agency as a team member")}</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
            <span>{t('agencies:coupon.whatHappens.proSubscription', "You'll receive a Pro subscription (valid for 1 year)")}</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
            <span>{t('agencies:coupon.whatHappens.agencyBranding', 'Your listings will display the agency branding')}</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
            <span>{t('agencies:coupon.whatHappens.promotionCoupons', 'Access to agency promotion coupons for your listings')}</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AgencyCouponRedemption;

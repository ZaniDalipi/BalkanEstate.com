import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { CheckCircleIcon, ArrowLeftIcon, LogoIcon, BuildingOfficeIcon, TicketIcon, ClipboardDocumentIcon } from '@/constants';
import { verifyPayment as verifyPaymentApi, type VerifyPaymentResponse } from '../api/paymentApi';
import { PaymentProvider } from '@/config/paymentConfig';
import { createAgency } from '@/features/agencies/api/agencyApi';

interface PaymentDetails {
  paymentStatus?: string;
  amountTotal?: number;
  customerEmail?: string;
  provider?: PaymentProvider;
  orderId?: string;
  subscription?: {
    plan: string;
    expiresAt: string;
    status: string;
  };
}

interface AgencyResult {
  agency?: {
    _id: string;
    slug: string;
    name: string;
  };
  agentCoupons?: {
    generated: boolean;
    count: number;
    message: string;
  };
  freeTrial?: {
    active: boolean;
    message: string;
  };
}

interface GeneratedCoupon {
  code: string;
  expiresAt: string;
  copied?: boolean;
}

const PaymentSuccess: React.FC = () => {
  const { t } = useTranslation(['payment']);
  const { state, dispatch } = useAppContext();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [provider, setProvider] = useState<PaymentProvider | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [agencyCreated, setAgencyCreated] = useState(false);
  const [creatingAgency, setCreatingAgency] = useState(false);
  const [agencyResult, setAgencyResult] = useState<AgencyResult | null>(null);
  const [agentCoupons, setAgentCoupons] = useState<GeneratedCoupon[]>([]);
  const [copiedCouponIndex, setCopiedCouponIndex] = useState<number | null>(null);

  useEffect(() => {
    // Get parameters from URL - supports both Stripe and Paddle
    const params = new URLSearchParams(window.location.search);
    const providerParam = params.get('provider') as PaymentProvider | null;
    const sid = params.get('session_id');
    const oid = params.get('order_id');

    setProvider(providerParam);

    if (sid) {
      setSessionId(sid);
    }
    if (oid) {
      setOrderId(oid);
    }

    // Verify payment based on available parameters
    if (sid || oid) {
      verifyPayment(params);
    } else {
      setError(t('success.noSessionFound'));
      setIsVerifying(false);
    }
  }, []);

  const verifyPayment = async (params: URLSearchParams) => {
    try {
      const token = localStorage.getItem('balkan_estate_token');

      if (!token) {
        throw new Error(t('success.loginToVerify'));
      }

      // Use the unified verification API
      const result = await verifyPaymentApi(params);

      if (!result.success && result.paymentStatus === 'error') {
        throw new Error(result.message || 'Failed to verify payment');
      }

      setPaymentDetails({
        paymentStatus: result.paymentStatus,
        amountTotal: result.amountTotal,
        customerEmail: result.customerEmail,
        provider: result.provider,
        orderId: result.orderId,
        subscription: result.subscription,
      });

      // Clear pending payment from session storage
      const pendingPayment = sessionStorage.getItem('pending_payment');
      if (pendingPayment) {
        sessionStorage.removeItem('pending_payment');
      }

      // If this was an Enterprise payment and we have pending agency data, create the agency
      const isEnterprisePayment = result.subscription?.plan?.toLowerCase().includes('enterprise') ||
                                   result.subscription?.plan?.toLowerCase().includes('agency');

      if (isEnterprisePayment && state.pendingAgencyData && !agencyCreated) {
        await handleAgencyCreation();
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to verify payment');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAgencyCreation = async () => {
    if (!state.pendingAgencyData || creatingAgency) return;

    setCreatingAgency(true);
    try {
      const agencyData = state.pendingAgencyData;
      const result = await createAgency(agencyData);

      if (result && (result.agency || result._id || result.id)) {
        setAgencyCreated(true);
        setAgencyResult(result);

        // Store coupons if generated
        if (result.agency?.agentCoupons && Array.isArray(result.agency.agentCoupons)) {
          setAgentCoupons(
            result.agency.agentCoupons
              .filter((c: any) => c.status === 'available')
              .map((c: any) => ({
                code: c.code,
                expiresAt: c.expiresAt,
              }))
          );
        }

        // Clear pending agency data from context
        dispatch({ type: 'SET_PENDING_AGENCY_DATA', payload: null });

        // Show success notification
        dispatch({
          type: 'SHOW_ALERT',
          payload: {
            type: 'success',
            title: 'Agency Created!',
            message: `Your agency "${agencyData.name}" has been created successfully.`,
          },
        });
      }
    } catch (agencyError) {
      console.error('Failed to create agency:', agencyError);
      // Don't block the payment success, just log the error
      // User can create agency manually from their account
      dispatch({
        type: 'SHOW_ALERT',
        payload: {
          type: 'warning',
          title: 'Agency Setup Pending',
          message: 'Payment successful! Please complete your agency setup from your account page.',
        },
      });
    } finally {
      setCreatingAgency(false);
    }
  };

  const handleViewAgency = () => {
    if (agencyResult?.agency?.slug) {
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: agencyResult.agency.slug });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
      window.history.pushState({}, '', `/agencies/${agencyResult.agency.slug}`);
    } else if (agencyResult?.agency?._id) {
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: agencyResult.agency._id });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
      window.history.pushState({}, '', `/agencies/${agencyResult.agency._id}`);
    }
  };

  const handleCopyCoupon = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCouponIndex(index);
      setTimeout(() => setCopiedCouponIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy coupon code:', err);
    }
  };

  const handleReturnHome = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
    window.history.pushState({}, '', '/account');
  };

  if (isVerifying || creatingAgency) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="flex flex-col items-center justify-center mb-4">
            <LogoIcon className="w-16 h-16 animate-pulse" />
            <h1 className="text-xl font-bold text-neutral-800 mt-2">
              Balkan<span className="text-primary">Estate</span><sup className="text-primary text-xs font-bold ml-0.5">AI</sup>
            </h1>
          </div>
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">
            {creatingAgency ? 'Creating Your Agency...' : t('success.verifying')}
          </h2>
          <p className="text-neutral-600">
            {creatingAgency
              ? 'Setting up your agency profile and generating team invitation codes...'
              : t('success.verifyingDescription')}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">{t('success.verificationFailed')}</h2>
          <p className="text-neutral-600 mb-6">{error}</p>
          <button
            onClick={handleReturnHome}
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2 mx-auto"
            aria-label={t('success.returnToAccount')}
          >
            <ArrowLeftIcon className="w-5 h-5" />
            {t('success.returnToAccount')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center">
          {/* Success Icon with Animation */}
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircleIcon className="w-16 h-16 text-white" />
            </div>
            {/* Confetti Effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl animate-ping opacity-20">🎉</div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-neutral-800 mb-2">{t('success.title')}</h1>
          <p className="text-lg text-neutral-600 mb-6">
            {t('success.description')}
          </p>

          {/* Payment Details */}
          {paymentDetails && (
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-xl p-6 mb-6 text-left border border-neutral-200">
              <h3 className="font-semibold text-neutral-800 mb-3">{t('success.details')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">{t('success.status')}:</span>
                  <span className="font-semibold text-green-600 capitalize">
                    {paymentDetails.paymentStatus || t('success.paid')}
                  </span>
                </div>
                {paymentDetails.amountTotal && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">{t('success.amount')}:</span>
                    <span className="font-semibold text-neutral-800">
                      €{paymentDetails.amountTotal.toFixed(2)}
                    </span>
                  </div>
                )}
                {paymentDetails.customerEmail && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">{t('success.email')}:</span>
                    <span className="font-medium text-neutral-800 truncate ml-2">
                      {paymentDetails.customerEmail}
                    </span>
                  </div>
                )}
                {paymentDetails.provider && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Provider:</span>
                    <span className="font-medium text-neutral-800 capitalize">
                      {paymentDetails.provider === 'stripe' ? 'Stripe' : 'Paddle'}
                    </span>
                  </div>
                )}
                {(sessionId || orderId) && (
                  <div className="flex justify-between mt-4 pt-4 border-t border-neutral-300">
                    <span className="text-neutral-500 text-xs">
                      {sessionId ? t('success.sessionId') : 'Order ID'}:
                    </span>
                    <span className="font-mono text-xs text-neutral-400 truncate ml-2 max-w-[200px]">
                      {sessionId || orderId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Agency Created Confirmation */}
          {agencyCreated && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-5 mb-6 text-left">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-amber-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BuildingOfficeIcon className="w-7 h-7 text-amber-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 mb-1">Agency Created Successfully!</h3>
                  <p className="text-sm text-amber-700 mb-3">
                    Your agency <span className="font-semibold">{agencyResult?.agency?.name || 'has been set up'}</span> is ready to go!
                  </p>
                  <ul className="text-sm text-amber-700 space-y-1 mb-4">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">✓</span>
                      <span>Invite team members with your unique codes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">✓</span>
                      <span>Customize your agency profile page</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">✓</span>
                      <span>Start listing properties under your agency</span>
                    </li>
                  </ul>
                  {agencyResult?.agency && (
                    <button
                      onClick={handleViewAgency}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <BuildingOfficeIcon className="w-5 h-5" />
                      View Your Agency
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Agent Invitation Coupons */}
          {agencyCreated && agentCoupons.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-5 mb-6 text-left">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TicketIcon className="w-7 h-7 text-purple-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-purple-900 mb-1">Team Invitation Codes</h3>
                  <p className="text-sm text-purple-700 mb-3">
                    Share these codes with your team members. Each code grants Pro Agent status when they register.
                  </p>
                  <div className="space-y-2">
                    {agentCoupons.map((coupon, index) => (
                      <div
                        key={coupon.code}
                        className="flex items-center gap-2 bg-white/80 rounded-lg p-2 border border-purple-200"
                      >
                        <code className="flex-1 font-mono text-sm text-purple-900 font-semibold tracking-wider">
                          {coupon.code}
                        </code>
                        <button
                          onClick={() => handleCopyCoupon(coupon.code, index)}
                          className={`p-2 rounded-lg transition-all ${
                            copiedCouponIndex === index
                              ? 'bg-green-100 text-green-600'
                              : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                          }`}
                          title={copiedCouponIndex === index ? 'Copied!' : 'Copy code'}
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-purple-600 mt-3 flex items-center gap-1">
                    <span>These codes have also been sent to your email</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* What's Next */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">{t('success.whatsNext')}</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>{t('success.subscriptionActive')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>{t('success.premiumAccess')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">✓</span>
                <span>{t('success.confirmationSent')}</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleReturnHome}
              className="w-full bg-gradient-to-r from-primary to-primary-dark text-white py-3 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              {t('success.goToAccount')}
            </button>
            <button
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
                window.history.pushState({}, '', '/');
              }}
              className="w-full text-neutral-600 hover:text-neutral-800 font-medium transition-colors py-2"
            >
              {t('success.browseProperties')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

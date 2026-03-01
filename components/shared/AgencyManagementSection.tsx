import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, UserRole } from '../../types';
import { getAgencies, verifyInvitationCode, createJoinRequest, leaveAgency } from '../../services/apiService';
import { useAppContext } from '../../context/AppContext';
import { useConfirmation } from '../../src/shared/hooks/useConfirmation';
import { useNotification } from '../../src/shared/hooks/useNotification';
import { TicketIcon, CheckCircleIcon, ExclamationTriangleIcon } from '../../constants';
import { API_URL } from '../../src/shared/api/config';
import { csrfHeaders, ensureCsrfToken } from '../../src/shared/api/httpClient';

interface Agency {
  _id: string;
  name: string;
  description?: string;
  city?: string;
  country?: string;
  slug?: string;
  logo?: string;
  totalAgents?: number;
}

interface AgencyManagementSectionProps {
  currentUser: User;
  onAgencyChange: () => void;
}

const AgencyManagementSection: React.FC<AgencyManagementSectionProps> = ({ currentUser, onAgencyChange }) => {
  const { t } = useTranslation(['agencies', 'common']);
  const { dispatch } = useAppContext();
  const { confirm } = useConfirmation();
  const { success } = useNotification();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [agentListingsLimit, setAgentListingsLimit] = useState<number>(25);

  // Coupon redemption state
  const [joinMethod, setJoinMethod] = useState<'invitation' | 'coupon'>('invitation');
  const [agentCouponCode, setAgentCouponCode] = useState('');
  const [couponRedemptionSuccess, setCouponRedemptionSuccess] = useState<{
    agencyName: string;
    agencyId: string;
    subscription: { tier: string; expiresAt: string; listingsLimit: number };
  } | null>(null);

  // Track newly joined agency for immediate UI update
  const [newlyJoinedAgency, setNewlyJoinedAgency] = useState<{ name: string; id: string } | null>(null);

  // Check if user is an agent
  const isUserAgent = (): boolean => {
    return (
      currentUser.availableRoles?.includes(UserRole.AGENT) ||
      currentUser.role === UserRole.AGENT ||
      !!currentUser.agentId ||
      !!currentUser.licenseNumber
    );
  };

  // Fetch agent product limit from DB on mount (configurable in admin)
  useEffect(() => {
    const fetchAgentProductLimit = async () => {
      try {
        const res = await fetch(`${API_URL}/products?role=agent`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const agentProduct = data.products?.find((p: any) => p.productId === 'agency_agent_yearly');
          if (agentProduct?.listingsLimit) {
            setAgentListingsLimit(agentProduct.listingsLimit);
          }
        }
      } catch {
        // Keep default fallback
      }
    };
    fetchAgentProductLimit();
  }, []);

  // Fetch pending join requests on mount and when showing the form
  useEffect(() => {
    fetchPendingRequests();
  }, [showForm]); // Refresh when form visibility changes

  // Fetch agencies when form is shown
  useEffect(() => {
    if (showForm && agencies.length === 0) {
      fetchAgencies();
    }
  }, [showForm]);

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/agency-join-requests/my-requests`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('balkan_estate_token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter for pending requests
        const pending = data.requests?.filter((req: any) => req.status === 'pending') || [];
        setPendingRequests(pending);
      }
    } catch {
      // Silently handle - pending requests are non-critical
    }
  };

  const fetchAgencies = async () => {
    try {
      setLoadingAgencies(true);
      const response = await getAgencies({ limit: 100 });
      setAgencies(response.agencies || []);
    } catch {
      setError(t('agencies:management.loadingAgencies', 'Failed to load agencies. Please try again.'));
    } finally {
      setLoadingAgencies(false);
    }
  };

  const handleSubmit = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setError('');

    // Validation
    if (!selectedAgencyId) {
      setError('Please select an agency');
      return;
    }

    if (!invitationCode.trim()) {
      setError('Please enter the invitation code');
      return;
    }

    try {
      setLoading(true);

      // Step 1: Verify the invitation code matches the selected agency
      const verification = await verifyInvitationCode(selectedAgencyId, invitationCode.trim());

      if (!verification.valid) {
        const errorMsg = verification.message || 'Invalid invitation code for this agency';
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Step 2: Send join request
      await createJoinRequest(selectedAgencyId, `Join request with invitation code: ${invitationCode.trim().toUpperCase()}`);

      // Step 3: Show success and update UI
      const agencyName = agencies.find(a => a._id === selectedAgencyId)?.name || 'the agency';
      const selectedAgencyData = agencies.find(a => a._id === selectedAgencyId);

      // Immediately add to pending requests for instant UI feedback
      const newPendingRequest = {
        _id: `temp_${Date.now()}`, // Temporary ID
        agencyId: selectedAgencyData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        message: `Join request with invitation code: ${invitationCode.trim().toUpperCase()}`
      };
      setPendingRequests([...pendingRequests, newPendingRequest]);

      // Reset form
      setSelectedAgencyId('');
      setInvitationCode('');
      setShowForm(false);

      // Show success message with better formatting
      await success(
        t('agencies:management.requestSentTitle', 'Request Sent!'),
        t('agencies:management.requestSentMessage', 'Your join request has been sent to {{name}}.\n\nYou will be notified when the agency responds.', { name: agencyName })
      );

      // Fetch updated pending requests from server (to get real IDs)
      await fetchPendingRequests();

      // Trigger the callback to refresh parent component
      onAgencyChange();

    } catch (err: any) {
      setError(err.message || 'Failed to process join request. Please check the invitation code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedAgencyId('');
    setInvitationCode('');
    setAgentCouponCode('');
    setError('');
    setJoinMethod('invitation');
    setCouponRedemptionSuccess(null);
  };

  // Handle agent coupon redemption
  const handleCouponRedemption = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setError('');

    const trimmedCode = agentCouponCode.trim().toUpperCase();
    if (!trimmedCode) {
      setError('Please enter a coupon code');
      return;
    }

    // Validate format before hitting the server
    const COUPON_FORMAT = /^[A-Z0-9]{2,6}-[A-Z0-9]{8}$/;
    if (!COUPON_FORMAT.test(trimmedCode)) {
      setError('Invalid code format. Expected: ABC-XXXXXXXX');
      return;
    }

    // Validate user is an agent
    if (!isUserAgent()) {
      setError('Only registered agents can redeem agency coupons. Please register as an agent first.');
      return;
    }

    if (!currentUser) {
      setError('User data unavailable. Please refresh the page.');
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem('balkan_estate_token')?.trim();
      if (!token) {
        setError('You are not logged in. Please log in and try again.');
        return;
      }

      await ensureCsrfToken();
      const response = await fetch(`${API_URL}/agencies/coupons/redeem`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...csrfHeaders(),
        },
        body: JSON.stringify({ couponCode: trimmedCode }),
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        setError('Unexpected response from server. Please try again.');
        return;
      }

      if (!response.ok) {
        // Handle specific error codes
        switch (data.code) {
          case 'INVALID_COUPON':
            setError('Invalid coupon code. Please check the code and try again.');
            break;
          case 'COUPON_ALREADY_USED':
            setError('This coupon has already been used by another agent.');
            break;
          case 'COUPON_EXPIRED':
            setError('This coupon has expired and can no longer be redeemed.');
            break;
          case 'COUPON_NOT_FOUND':
            setError('Coupon not found. Please verify the code is correct.');
            break;
          case 'AGENCY_SUBSCRIPTION_INACTIVE':
            setError('The agency subscription is no longer active. This coupon cannot be redeemed.');
            break;
          default:
            setError(data.message || 'Failed to redeem coupon. Please try again.');
        }
        return;
      }

      // Success! Update context and local state immediately
      if (data?.subscription && data?.agency?.id) {
        // Update app context
        dispatch({
          type: 'UPDATE_USER',
          payload: {
            subscription: {
              ...(currentUser.subscription ?? {}),
              tier: data.subscription.tier,
              status: data.subscription.status,
              listingsLimit: data.subscription.listingsLimit,
              expiresAt: data.subscription.expiresAt,
            } as any,
            agencyId: data.agency.id,
            agencyName: data.agency.name ?? '',
          },
        });

        // Set local state for immediate UI update
        setNewlyJoinedAgency({
          name: data.agency.name,
          id: data.agency.id,
        });

        setCouponRedemptionSuccess({
          agencyName: data.agency.name,
          agencyId: data.agency.id,
          subscription: data.subscription,
        });

        await success(
          t('agencies:management.couponRedeemedTitle', 'Coupon Redeemed!'),
          t('agencies:management.couponRedeemedMessage', "You've joined {{name}} with a Pro subscription!", { name: data.agency.name })
        );

        // Refresh user data from server
        onAgencyChange();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error. Please check your connection and try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveAgency = async () => {
    const confirmed = await confirm({
      title: t('agencies:management.leaveAgencyTitle', 'Leave Agency'),
      message: t('agencies:management.leaveAgencyMessage', 'Are you sure you want to leave {{name}}? You will become an Independent Agent.', { name: currentUser.agencyName }),
      confirmLabel: t('agencies:management.leaveAgency', 'Leave Agency'),
      cancelLabel: t('common:cancel', 'Cancel'),
      type: 'warning',
    });

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      await leaveAgency();

      // Update user context immediately
      dispatch({
        type: 'UPDATE_USER',
        payload: {
          agencyName: t('agencies:badge.independentAgent', 'Independent Agent'),
          agencyId: null,
        }
      });

      await success(t('agencies:management.leaveAgencyTitle', 'Left Agency'), t('agencies:management.leaveAgencyDone', 'You have successfully left the agency.\n\nYou are now an Independent Agent.'));

      // Trigger refresh callback
      onAgencyChange();

    } catch (err: any) {
      setError(err.message || 'Failed to leave agency. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Use newly joined agency for immediate display, fallback to props
  const independentLabel = t('agencies:badge.independentAgent', 'Independent Agent');

  const currentAgencyInfo = newlyJoinedAgency?.name
    || (currentUser.agencyName && currentUser.agencyName !== 'Independent Agent'
      ? currentUser.agencyName
      : independentLabel);

  const isIndependent = !newlyJoinedAgency && (!currentUser.agencyName || currentUser.agencyName === 'Independent Agent');

  return (
    <div className="space-y-4">
      {/* Current Agency Status */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{t('agencies:management.currentAgency', 'Current Agency')}</h4>
            <p className="text-lg font-bold text-blue-600 mt-1">{currentAgencyInfo}</p>
          </div>
          {!showForm && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isIndependent ? t('agencies:management.joinAnAgency', 'Join an Agency') : t('agencies:management.switchAgency', 'Switch Agency')}
              </button>
              {!isIndependent && (
                <button
                  type="button"
                  onClick={handleLeaveAgency}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('agencies:management.leaveAgency', 'Leave Agency')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pending Join Requests */}
      {pendingRequests.length > 0 && (
        <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
          <h4 className="text-sm font-semibold text-yellow-900 mb-2">{t('agencies:management.pendingJoinRequests', 'Pending Join Requests')}</h4>
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <div key={request._id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200">
                <div>
                  <p className="font-medium text-gray-900">{request.agencyId?.name || 'Unknown Agency'}</p>
                  <p className="text-xs text-gray-600">{t('agencies:management.sent', 'Sent:')} {new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                  {t('agencies:management.pendingApproval', 'Pending Approval')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agency Join/Switch Form */}
      {showForm && (
        <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg animate-fade-in">
          <h4 className="text-lg font-semibold text-blue-900 mb-4">
            {isIndependent ? t('agencies:management.joinAnAgency', 'Join an Agency') : t('agencies:management.switchToDifferent', 'Switch to a Different Agency')}
          </h4>

          {!isIndependent && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                {t('agencies:management.currentlyWith', 'You are currently with {{name}}. Switching will remove you from your current agency.', { name: currentUser.agencyName })}
              </p>
            </div>
          )}

          {/* Coupon Redemption Success */}
          {couponRedemptionSuccess && (
            <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <h5 className="font-semibold text-green-800">{t('agencies:management.welcomeToAgency', 'Welcome to {{name}}!', { name: couponRedemptionSuccess.agencyName })}</h5>
                  <p className="text-sm text-green-700 mt-1">
                    {t('agencies:management.proSubscriptionInfo', 'You now have a Pro subscription with {{listings}} listings, valid until {{date}}.', { listings: couponRedemptionSuccess.subscription.listingsLimit, date: new Date(couponRedemptionSuccess.subscription.expiresAt).toLocaleDateString() })}
                  </p>
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        // Navigate to the agency page
                        dispatch({ type: 'SET_SELECTED_AGENCY', payload: couponRedemptionSuccess.agencyId });
                        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
                        window.history.pushState({}, '', `/agencies/${couponRedemptionSuccess.agencyId}`);
                        handleCancel();
                      }}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {t('agencies:management.viewAgency', 'View Agency')}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 border border-green-600 text-green-700 text-sm font-semibold rounded-lg hover:bg-green-50 transition-colors"
                    >
                      {t('agencies:management.done', 'Done')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!couponRedemptionSuccess && (
            <>
              {/* Join Method Toggle */}
              <div className="mb-4 flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => { setJoinMethod('invitation'); setError(''); }}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    joinMethod === 'invitation'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('agencies:management.invitationCode', 'Invitation Code')}
                </button>
                <button
                  type="button"
                  onClick={() => { setJoinMethod('coupon'); setError(''); }}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                    joinMethod === 'coupon'
                      ? 'bg-white text-amber-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <TicketIcon className="w-4 h-4" />
                  {t('agencies:management.agentCoupon', 'Agent Coupon')}
                </button>
              </div>

              {joinMethod === 'invitation' ? (
                /* Invitation Code Form - using div to avoid nested form issue */
                <div className="space-y-4">
                  {/* Agency Selection Dropdown */}
                  <div>
                    <label htmlFor="agency-select" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('agencies:management.selectAgency', 'Select Agency')} <span className="text-red-500">*</span>
                    </label>
                    {loadingAgencies ? (
                      <div className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-500 text-sm">
                        {t('agencies:management.loadingAgencies', 'Loading agencies...')}
                      </div>
                    ) : (
                      <select
                        id="agency-select"
                        value={selectedAgencyId}
                        onChange={(e) => {
                          setSelectedAgencyId(e.target.value);
                          setError('');
                        }}
                        disabled={loading}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                      >
                        <option value="">{t('agencies:management.chooseAgency', '-- Choose an agency --')}</option>
                        {agencies.map((agency) => (
                          <option key={agency._id} value={agency._id}>
                            {agency.name} {agency.city ? `(${agency.city}${agency.country ? ', ' + agency.country : ''})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Invitation Code Input */}
                  <div>
                    <label htmlFor="invitation-code" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('agencies:management.agencyInvitationCode', 'Agency Invitation Code')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="invitation-code"
                      value={invitationCode}
                      onChange={(e) => {
                        setInvitationCode(e.target.value.toUpperCase());
                        setError('');
                      }}
                      disabled={loading}
                      placeholder={t('agencies:management.invitationCodePlaceholder', 'e.g., AGY-BELGRAD-A1B2C3')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      {t('agencies:management.enterInvitationCode', 'Enter the invitation code for the selected agency')}
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={loading}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {t('common:cancel', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading || !selectedAgencyId || !invitationCode.trim()}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {loading ? t('agencies:management.verifyingSending', 'Verifying & Sending...') : t('agencies:management.sendJoinRequest', 'Send Join Request')}
                    </button>
                  </div>
                </div>
              ) : (
                /* Agent Coupon Redemption Form - using div to avoid nested form issue */
                <div className="space-y-4">
                  {!isUserAgent() && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div>
                          <h5 className="font-semibold text-amber-800">{t('agencies:management.agentRegistrationRequired', 'Agent Registration Required')}</h5>
                          <p className="text-sm text-amber-700 mt-1">
                            {t('agencies:management.onlyAgentsCanRedeem', 'Only registered agents can redeem agency coupons. Please register as an agent first.')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <TicketIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-semibold text-amber-800">{t('agencies:management.agentCouponBenefits', 'Agent Coupon Benefits')}</h5>
                        <ul className="text-sm text-amber-700 mt-1 space-y-1">
                          <li>• {t('agencies:management.benefitInstantJoin', 'Instantly join the agency (no approval needed)')}</li>
                          <li>• {t('agencies:management.benefitProSubscription', 'Get a Pro subscription for 1 year')}</li>
                          <li>• {t('agencies:management.benefitListings', 'Up to 25 active listings')}</li>
                          <li>• {t('agencies:management.benefitBranding', 'Agency branding on your listings')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="agent-coupon-code" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('agencies:management.agentCouponCode', 'Agent Coupon Code')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="agent-coupon-code"
                      value={agentCouponCode}
                      onChange={(e) => {
                        setAgentCouponCode(e.target.value.toUpperCase());
                        setError('');
                      }}
                      disabled={loading || !isUserAgent()}
                      placeholder={t('agencies:management.agentCouponCodePlaceholder', 'e.g., ABC-XXXXXXXX')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm uppercase"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      {t('agencies:management.enterCouponFromEmail', 'Enter the coupon code you received from the agency owner via email')}
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={loading}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {t('common:cancel', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleCouponRedemption}
                      disabled={loading || !agentCouponCode.trim() || !isUserAgent()}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          {t('agencies:coupon.redeeming', 'Redeeming...')}
                        </>
                      ) : (
                        <>
                          <TicketIcon className="w-4 h-4" />
                          {t('agencies:management.redeemCoupon', 'Redeem Coupon')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AgencyManagementSection;

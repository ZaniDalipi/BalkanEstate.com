import React, { useEffect, useState } from 'react';
import { getFeaturedSubscription } from '../../services/apiService';
import { SparklesIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '../../constants';

// Add shimmer animation styles
const shimmerStyles = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`;

interface FeaturedSubscriptionCardProps {
  agencyId: string;
  onUpgrade?: () => void;
}

const FeaturedSubscriptionCard: React.FC<FeaturedSubscriptionCardProps> = React.memo(({
  agencyId,
  onUpgrade,
}) => {
  const [subscription, setSubscription] = useState<any>(null);
  const [agencyStatus, setAgencyStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use AbortController to cancel requests if component unmounts
    const abortController = new AbortController();

    fetchSubscription();

    return () => {
      abortController.abort();
    };
  }, [agencyId]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await getFeaturedSubscription(agencyId);
      setSubscription(response.subscription);
      setAgencyStatus(response.agency);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError(err.message || 'Failed to load subscription');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'trial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'canceled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'trial':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'expired':
      case 'canceled':
        return <XCircleIcon className="w-5 h-5" />;
      default:
        return <ClockIcon className="w-5 h-5" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const daysRemaining = subscription
    ? Math.ceil(
        (new Date(subscription.currentPeriodEnd).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  // Calculate total days in subscription period for progress bar
  const totalDays = subscription
    ? Math.ceil(
        (new Date(subscription.currentPeriodEnd).getTime() - new Date(subscription.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  // Calculate progress percentage (100% at start, 0% at end)
  const progressPercentage = totalDays > 0 ? Math.max(0, Math.min(100, (daysRemaining / totalDays) * 100)) : 0;

  // Get color based on days remaining
  const getProgressColor = () => {
    if (daysRemaining > 7) return 'from-green-500 to-green-600';
    if (daysRemaining > 3) return 'from-yellow-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  if (loading) {
    return (
      <>
        <style>{shimmerStyles}</style>
        <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </>
    );
  }

  if (!subscription) {
    // Check if agency is featured without an active subscription (legacy or direct database update)
    if (agencyStatus?.isFeatured && agencyStatus?.daysRemaining > 0) {
      return (
        <>
          <style>{shimmerStyles}</style>
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-md p-6 border-2 border-purple-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-neutral-800 mb-2">
                  Agency Currently Featured ✨
                </h3>
                <p className="text-sm text-neutral-600 mb-3">
                  Your agency is currently featured and receiving enhanced visibility.
                </p>
                <div className="bg-white border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-neutral-700">Time Remaining</span>
                    <span className={`text-lg font-bold ${
                      agencyStatus.daysRemaining <= 3 ? 'text-red-600 animate-pulse' :
                      agencyStatus.daysRemaining <= 7 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {agencyStatus.daysRemaining} {agencyStatus.daysRemaining === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                  {agencyStatus.featuredEndDate && (
                    <p className="text-xs text-neutral-500">
                      Expires: {formatDate(agencyStatus.featuredEndDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    // No subscription and not featured - show upgrade option
    return (
      <>
        <style>{shimmerStyles}</style>
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-md p-6 border-2 border-dashed border-purple-300">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-neutral-800 mb-2">
              Feature Your Agency
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Get more visibility with a featured listing. Your agency will appear at the
              top of search results and in the featured agencies carousel.
            </p>
            <button
              onClick={onUpgrade}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-primary text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300"
            >
              Start €10/week Plan
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  const isActive = subscription.status === 'active' || subscription.status === 'trial';

  return (
    <>
      <style>{shimmerStyles}</style>
      <div
        className={`rounded-xl shadow-md p-6 border-2 ${
          isActive
            ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'
            : 'bg-white border-gray-200'
        }`}
      >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isActive
                ? 'bg-gradient-to-br from-purple-500 to-primary'
                : 'bg-gray-300'
            }`}
          >
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-800">Featured Agency</h3>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-semibold ${getStatusColor(
                subscription.status
              )}`}
            >
              {getStatusIcon(subscription.status)}
              <span className="capitalize">{subscription.status}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Interactive Progress Bar */}
        {isActive && daysRemaining >= 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-neutral-700">
                {subscription.isTrial ? '🎉 Free Trial Progress' : '📅 Subscription Period'}
              </span>
              <span className={`font-bold ${daysRemaining <= 3 ? 'text-red-600 animate-pulse' : daysRemaining <= 7 ? 'text-yellow-600' : 'text-green-600'}`}>
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
              </span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-500 ease-out relative`}
                style={{ width: `${progressPercentage}%` }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>

              {/* Days remaining label inside progress bar */}
              {progressPercentage > 20 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow-lg">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>{formatDate(subscription.startDate)}</span>
              <span>{formatDate(subscription.currentPeriodEnd)}</span>
            </div>
          </div>
        )}

        {subscription.isTrial && (
          <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-blue-800">
              🎉 Free Trial Active
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Your free trial ends on {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-neutral-500">Interval</p>
            <p className="font-semibold text-neutral-800 capitalize">
              {subscription.interval}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Price</p>
            <p className="font-semibold text-neutral-800">
              €{subscription.price}
              {subscription.discountApplied > 0 && (
                <span className="text-xs text-green-600 ml-2">
                  (-€{subscription.discountApplied})
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Start Date</p>
            <p className="font-semibold text-neutral-800">
              {formatDate(subscription.startDate)}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">
              {isActive ? 'Renews On' : 'Ended On'}
            </p>
            <p className="font-semibold text-neutral-800">
              {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        </div>

        {subscription.appliedCouponCode && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              ✓ Coupon <strong>{subscription.appliedCouponCode}</strong> applied
            </p>
          </div>
        )}

        {subscription.cancelAtPeriodEnd && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Subscription will be canceled at the end of the current period
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  );
});

// Memoization comparison function - only re-render if agencyId changes
FeaturedSubscriptionCard.displayName = 'FeaturedSubscriptionCard';

export default FeaturedSubscriptionCard;

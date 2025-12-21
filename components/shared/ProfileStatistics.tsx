import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { User, UserRole } from '../../types';
import { ChartBarIcon, HomeIcon, EyeIcon, HeartIcon, ChatBubbleBottomCenterTextIcon, CalendarIcon, MapPinIcon, BuildingOfficeIcon, BedIcon, BathIcon, SqftIcon } from '../../constants';
import { formatPrice } from '../../utils/currency';

interface ProfileStatisticsProps {
  user: User & { subscriptionPlan?: string };
}

interface UserStats {
  activeListings: number;
  totalListings: number;
  totalViews: number;
  totalSaves: number;
  totalInquiries: number;
  propertiesSold?: number;
  totalSalesValue?: number;
}

interface SubscriptionInfo {
  productId: string;
  status: string;
  expirationDate: string;
}

interface SaleRecord {
  _id: string;
  propertyId?: string;
  propertyTitle?: string;
  propertyAddress: string;
  propertyCity: string;
  propertyCountry: string;
  propertyType: string;
  salePrice: number;
  currency: string;
  soldAt: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  totalViews: number;
  totalSaves: number;
  daysOnMarket: number;
  commission?: number;
  imageUrl?: string;
}

interface SalesHistoryData {
  sales: SaleRecord[];
  summary: {
    totalSales: number;
    totalRevenue: number;
    totalCommission: number;
    averageSalePrice: number;
    averageDaysOnMarket: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Filter options
type PropertyTypeFilter = 'all' | 'apartment' | 'house' | 'villa' | 'land' | 'commercial';
type DateFilter = 'all' | 'thisMonth' | 'last3Months' | 'last6Months' | 'thisYear' | 'lastYear';
type PriceFilter = 'all' | 'under100k' | '100k-500k' | '500k-1m' | 'over1m';

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  loading?: boolean;
}> = ({ icon, label, value, subtext, color, loading = false }) => (
  <div className={`bg-gradient-to-br ${color} rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow`}>
    <div className="flex items-center justify-between mb-2">
      <div className="text-white/80">{icon}</div>
    </div>
    {loading ? (
      <div className="animate-pulse">
        <div className="h-8 bg-white/30 rounded mb-2"></div>
        <div className="h-4 bg-white/20 rounded"></div>
      </div>
    ) : (
      <>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-sm font-medium text-white/90">{label}</div>
        {subtext && <div className="text-xs text-white/70 mt-1">{subtext}</div>}
      </>
    )}
  </div>
);

// Sold Property Card Component
const SoldPropertyCard: React.FC<{ sale: SaleRecord }> = ({ sale }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative h-36 bg-neutral-100">
        {sale.imageUrl && !imageError ? (
          <img
            src={sale.imageUrl}
            alt={sale.propertyTitle || sale.propertyAddress}
            className="w-full h-full object-cover grayscale-[30%]"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-300">
            <BuildingOfficeIcon className="w-10 h-10 text-neutral-400" />
          </div>
        )}
        {/* Sold Badge */}
        <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          SOLD
        </div>
        {/* Property Type */}
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-neutral-800 text-[10px] font-semibold px-2 py-1 rounded-md capitalize">
          {sale.propertyType}
        </div>
        {/* Sale Price */}
        <div className="absolute bottom-2 right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow">
          {formatPrice(sale.salePrice, sale.propertyCountry)}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        {sale.propertyTitle && (
          <h4 className="text-sm font-bold text-neutral-900 mb-1 line-clamp-1">{sale.propertyTitle}</h4>
        )}

        {/* Address */}
        <p className="text-xs text-neutral-600 mb-2 line-clamp-1">
          {sale.propertyAddress}
        </p>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-neutral-500 mb-2">
          <MapPinIcon className="w-3 h-3" />
          <span>{sale.propertyCity}, {sale.propertyCountry}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {sale.beds && (
            <div className="flex flex-col items-center bg-neutral-100 py-1.5 rounded text-xs">
              <BedIcon className="w-3 h-3 text-primary mb-0.5" />
              <span className="font-bold text-neutral-800">{sale.beds}</span>
            </div>
          )}
          {sale.baths && (
            <div className="flex flex-col items-center bg-neutral-100 py-1.5 rounded text-xs">
              <BathIcon className="w-3 h-3 text-primary mb-0.5" />
              <span className="font-bold text-neutral-800">{sale.baths}</span>
            </div>
          )}
          {sale.sqft && (
            <div className="flex flex-col items-center bg-neutral-100 py-1.5 rounded text-xs">
              <SqftIcon className="w-3 h-3 text-primary mb-0.5" />
              <span className="font-bold text-neutral-800">{sale.sqft}</span>
            </div>
          )}
        </div>

        {/* Sale Info */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[10px] text-neutral-500">
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" />
            <span>{new Date(sale.soldAt).toLocaleDateString()}</span>
          </div>
          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
            {sale.daysOnMarket} days on market
          </span>
        </div>
      </div>
    </div>
  );
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const ProfileStatistics: React.FC<ProfileStatisticsProps> = ({ user }) => {
  const [stats, setStats] = useState<UserStats>({
    activeListings: user.listingsCount || 0,
    totalListings: user.totalListingsCreated || 0,
    totalViews: 0,
    totalSaves: 0,
    totalInquiries: 0,
    propertiesSold:  0,
    totalSalesValue: 0,
  });

  const [salesHistory, setSalesHistory] = useState<SalesHistoryData | null>(null);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  // Filter states
  const [typeFilter, setTypeFilter] = useState<PropertyTypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');

  // Get auth token helper
  const getAuthToken = useCallback(() => {
    return localStorage.getItem('balkan_estate_token');
  }, []);

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/subscriptions/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.subscription) {
          setSubscription({
            productId: data.subscription.productId,
            status: data.subscription.status,
            expirationDate: data.subscription.expirationDate,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  }, [getAuthToken]);

  // Check if user has pro/enterprise subscription - check both user object and subscription data
  const canDownload = useMemo(() => {
    // Check user.subscriptionPlan first
    const userPlan = user.subscriptionPlan?.toLowerCase() || '';
    if (userPlan.includes('pro') || userPlan.includes('enterprise') || userPlan.includes('premium')) {
      return true;
    }

    // Check subscription from API
    if (subscription) {
      const subPlan = subscription.productId?.toLowerCase() || '';
      const isActive = subscription.status === 'active' || subscription.status === 'trial' || subscription.status === 'grace';
      const notExpired = new Date(subscription.expirationDate) > new Date();

      if (isActive && notExpired && (subPlan.includes('pro') || subPlan.includes('enterprise') || subPlan.includes('premium'))) {
        return true;
      }
    }

    // Also check user.isSubscribed as fallback
    if (user.isSubscribed) {
      return true;
    }

    return false;
  }, [user.subscriptionPlan, user.isSubscribed, subscription]);

  // Filter sales based on filters
  const filteredSales = useMemo(() => {
    if (!salesHistory?.sales) return [];

    return salesHistory.sales.filter(sale => {
      // Type filter
      if (typeFilter !== 'all' && sale.propertyType.toLowerCase() !== typeFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const saleDate = new Date(sale.soldAt);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);

        switch (dateFilter) {
          case 'thisMonth':
            if (saleDate < startOfMonth) return false;
            break;
          case 'last3Months':
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            if (saleDate < threeMonthsAgo) return false;
            break;
          case 'last6Months':
            const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            if (saleDate < sixMonthsAgo) return false;
            break;
          case 'thisYear':
            if (saleDate < startOfYear) return false;
            break;
          case 'lastYear':
            if (saleDate < lastYear || saleDate > endOfLastYear) return false;
            break;
        }
      }

      // Price filter
      if (priceFilter !== 'all') {
        switch (priceFilter) {
          case 'under100k':
            if (sale.salePrice >= 100000) return false;
            break;
          case '100k-500k':
            if (sale.salePrice < 100000 || sale.salePrice >= 500000) return false;
            break;
          case '500k-1m':
            if (sale.salePrice < 500000 || sale.salePrice >= 1000000) return false;
            break;
          case 'over1m':
            if (sale.salePrice < 1000000) return false;
            break;
        }
      }

      return true;
    });
  }, [salesHistory?.sales, typeFilter, dateFilter, priceFilter]);

  // Calculate filtered summary
  const filteredSummary = useMemo(() => {
    if (filteredSales.length === 0) {
      return {
        totalSales: 0,
        totalRevenue: 0,
        averageSalePrice: 0,
        averageDaysOnMarket: 0,
      };
    }

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.salePrice, 0);
    const totalDays = filteredSales.reduce((sum, sale) => sum + sale.daysOnMarket, 0);

    return {
      totalSales: filteredSales.length,
      totalRevenue,
      averageSalePrice: totalRevenue / filteredSales.length,
      averageDaysOnMarket: totalDays / filteredSales.length,
    };
  }, [filteredSales]);

  // Enhanced stats fetching with fallbacks
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      let statsData: UserStats | null = null;

      try {
        const syncResponse = await fetch('/api/auth/sync-stats', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          statsData = syncData.stats;
        }
      } catch (syncError) {
        console.warn('Sync failed, falling back to stats fetch:', syncError);
      }

      if (!statsData) {
        const response = await fetch('/api/auth/my-stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          statsData = data.stats;
        } else {
          throw new Error(`Failed to fetch stats: ${response.status}`);
        }
      }

      setStats({
        ...statsData,
        activeListings: statsData.activeListings ?? user.listingsCount ?? 0,
        totalListings: statsData.totalListings ?? user.totalListingsCreated ?? 0,
      });

    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      setStats({
        activeListings: user.listingsCount || 0,
        totalListings: user.totalListingsCreated || 0,
        totalViews: 0,
        totalSaves: 0,
        totalInquiries: 0,
        propertiesSold: 0,
        totalSalesValue: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user.listingsCount, user.totalListingsCreated, getAuthToken]);

  // Enhanced refresh with retry logic
  const handleRefreshStats = async () => {
    try {
      setSyncing(true);
      const token = getAuthToken();

      const syncResponse = await fetch('/api/auth/sync-stats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        setStats(prev => ({
          ...prev,
          ...syncData.stats
        }));
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Failed to sync stats:', error);
      await fetchStats();
    } finally {
      setSyncing(false);
    }
  };

  // Enhanced sales history fetch
  const fetchSalesHistory = async () => {
    if (showSalesHistory) {
      setShowSalesHistory(false);
      return;
    }

    try {
      setLoadingHistory(true);
      const token = getAuthToken();
      const response = await fetch('/api/sales-history/my-sales?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSalesHistory(data);
        setShowSalesHistory(true);
      } else {
        throw new Error(`Failed to fetch sales history: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch sales history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Download sales data as CSV
  const handleDownloadCSV = () => {
    if (!canDownload || filteredSales.length === 0) return;

    const headers = ['Title', 'Address', 'City', 'Country', 'Type', 'Beds', 'Baths', 'Sqft', 'Sale Price', 'Days on Market', 'Sold Date'];
    const rows = filteredSales.map(sale => [
      sale.propertyTitle || '',
      sale.propertyAddress,
      sale.propertyCity,
      sale.propertyCountry,
      sale.propertyType,
      sale.beds || '',
      sale.baths || '',
      sale.sqft || '',
      sale.salePrice,
      sale.daysOnMarket,
      new Date(sale.soldAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format currency helper
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `€${(amount / 1000).toFixed(0)}K`;
    }
    return `€${amount}`;
  };

  // Format number with abbreviations
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toLocaleString();
  };

  // Initial data load
  useEffect(() => {
    fetchStats();
    fetchSubscription();
  }, [fetchStats, fetchSubscription]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-neutral-200 rounded w-48"></div>
          <div className="h-10 bg-neutral-200 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-neutral-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const isSellerRole = user.role === UserRole.AGENT || user.role === UserRole.PRIVATE_SELLER;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="w-8 h-8 text-primary" />
          <h2 className="text-2xl font-bold text-neutral-800">Your Statistics</h2>
        </div>
        <button
          onClick={handleRefreshStats}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh statistics"
        >
          <svg
            className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {syncing ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      {isSellerRole ? (
        <>
          {/* Primary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              icon={<HomeIcon className="w-6 h-6" />}
              label="Active Listings"
              value={stats.activeListings}
              subtext={`${stats.totalListings} total created`}
              color="from-blue-500 to-blue-600"
              loading={loading}
            />
            <StatCard
              icon={<EyeIcon className="w-6 h-6" />}
              label="Total Views"
              value={formatNumber(stats.totalViews)}
              subtext="Across all listings"
              color="from-purple-500 to-purple-600"
              loading={loading}
            />
            <StatCard
              icon={<HeartIcon className="w-6 h-6" />}
              label="Total Saves"
              value={formatNumber(stats.totalSaves)}
              subtext="Properties favorited"
              color="from-pink-500 to-pink-600"
              loading={loading}
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              icon={<ChatBubbleBottomCenterTextIcon className="w-6 h-6" />}
              label="Total Inquiries"
              value={formatNumber(stats.totalInquiries)}
              subtext="Buyer messages received"
              color="from-green-500 to-green-600"
              loading={loading}
            />

            {user.role === UserRole.AGENT && (
              <>
                <StatCard
                  icon={<HomeIcon className="w-6 h-6" />}
                  label="Properties Sold"
                  value={stats.propertiesSold || 0}
                  subtext="Successful sales"
                  color="from-orange-500 to-orange-600"
                  loading={loading}
                />
                <StatCard
                  icon={<ChartBarIcon className="w-6 h-6" />}
                  label="Total Sales Value"
                  value={formatCurrency(stats.totalSalesValue || 0)}
                  subtext="Lifetime revenue"
                  color="from-teal-500 to-teal-600"
                  loading={loading}
                />
              </>
            )}
          </div>

          {/* Agency Info */}
          {user.role === UserRole.AGENT && user.agencyName && (
            <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ChartBarIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-800">Agency Performance</h3>
              </div>
              <p className="text-neutral-600">
                You are part of <span className="font-semibold text-primary">{user.agencyName}</span>
              </p>
              {user.licenseVerified && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                    ✓ Verified License
                  </span>
                  <span className="text-sm text-neutral-500">License #{user.licenseNumber}</span>
                </div>
              )}
            </div>
          )}

          {/* Sales History Section */}
          {(stats.propertiesSold || 0) > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-neutral-800">Sales History</h3>
                <button
                  onClick={fetchSalesHistory}
                  disabled={loadingHistory}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {loadingHistory ? 'Loading...' : showSalesHistory ? 'Hide History' : 'View History'}
                </button>
              </div>

              {showSalesHistory && salesHistory && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="bg-white rounded-xl border border-neutral-200 p-4">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="text-sm font-semibold text-neutral-700">Filters:</span>

                      {/* Type Filter */}
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as PropertyTypeFilter)}
                        className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="all">All Types</option>
                        <option value="apartment">Apartment</option>
                        <option value="house">House</option>
                        <option value="villa">Villa</option>
                        <option value="land">Land</option>
                        <option value="commercial">Commercial</option>
                      </select>

                      {/* Date Filter */}
                      <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                        className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="all">All Time</option>
                        <option value="thisMonth">This Month</option>
                        <option value="last3Months">Last 3 Months</option>
                        <option value="last6Months">Last 6 Months</option>
                        <option value="thisYear">This Year</option>
                        <option value="lastYear">Last Year</option>
                      </select>

                      {/* Price Filter */}
                      <select
                        value={priceFilter}
                        onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
                        className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      >
                        <option value="all">All Prices</option>
                        <option value="under100k">Under €100K</option>
                        <option value="100k-500k">€100K - €500K</option>
                        <option value="500k-1m">€500K - €1M</option>
                        <option value="over1m">Over €1M</option>
                      </select>

                      {/* Clear Filters */}
                      {(typeFilter !== 'all' || dateFilter !== 'all' || priceFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setTypeFilter('all');
                            setDateFilter('all');
                            setPriceFilter('all');
                          }}
                          className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Clear Filters
                        </button>
                      )}

                      {/* Download Button */}
                      <div className="flex-1"></div>
                      {canDownload ? (
                        <button
                          onClick={handleDownloadCSV}
                          disabled={filteredSales.length === 0}
                          className="flex items-center gap-2 px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download CSV
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-1.5 text-sm bg-neutral-100 text-neutral-500 rounded-lg cursor-not-allowed" title="Upgrade to Pro or Enterprise to download">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>Pro/Enterprise</span>
                        </div>
                      )}
                    </div>

                    {/* Active filters display */}
                    {(typeFilter !== 'all' || dateFilter !== 'all' || priceFilter !== 'all') && (
                      <div className="text-xs text-neutral-500">
                        Showing {filteredSales.length} of {salesHistory.sales.length} sales
                      </div>
                    )}
                  </div>

                  {/* Summary Cards - Based on filtered data */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-4 text-white">
                      <div className="text-sm opacity-90">Total Revenue</div>
                      <div className="text-2xl font-bold">{formatCurrency(filteredSummary.totalRevenue)}</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                      <div className="text-sm opacity-90">Avg. Sale Price</div>
                      <div className="text-2xl font-bold">{formatCurrency(filteredSummary.averageSalePrice)}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                      <div className="text-sm opacity-90">Avg. Days on Market</div>
                      <div className="text-2xl font-bold">{Math.round(filteredSummary.averageDaysOnMarket)}</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-4 text-white">
                      <div className="text-sm opacity-90">Total Sales</div>
                      <div className="text-2xl font-bold">{filteredSummary.totalSales}</div>
                    </div>
                  </div>

                  {/* Sold Property Cards Grid */}
                  {filteredSales.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredSales.map((sale) => (
                        <SoldPropertyCard key={sale._id} sale={sale} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-neutral-50 rounded-xl border border-neutral-200">
                      <HomeIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                      <p className="text-neutral-600 font-medium">No sales match your filters</p>
                      <p className="text-sm text-neutral-500 mt-1">Try adjusting your filter criteria</p>
                    </div>
                  )}

                  {salesHistory.pagination.total > salesHistory.pagination.limit && (
                    <div className="text-center text-sm text-neutral-600">
                      Showing {filteredSales.length} of {salesHistory.pagination.total} total sales
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="p-8 text-center bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-300">
          <ChartBarIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-700 mb-2">Statistics Available for Sellers</h3>
          <p className="text-neutral-500">
            Switch to Agent or Private Seller role to see your property statistics.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfileStatistics;

import React, { useState, useEffect } from 'react';
import { XMarkIcon, ChartBarIcon, ClockIcon, EyeIcon, InquiriesIcon, HeartIcon } from '@/constants';
import * as api from '@/services/apiService';
import { formatPrice } from '@/utils/currency';

interface PromotionHistoryItem {
  _id: string;
  tier: string;
  tierInfo: {
    name: string;
    color: string;
  };
  startDate: string;
  endDate: string;
  duration: number;
  hasUrgentBadge: boolean;
  price: number;
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  paymentStatus: string;
  isFromAgencyAllocation: boolean;
  autoExtend: boolean;
  performance: {
    views: number;
    inquiries: number;
    saves: number;
  };
  createdAt: string;
}

interface PromotionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
}

// Tier configuration
const TIER_CONFIG: Record<string, { color: string; bg: string; icon: string; gradient: string }> = {
  premium: { color: 'text-amber-700', bg: 'bg-amber-100', icon: '👑', gradient: 'from-amber-500 to-yellow-400' },
  highlight: { color: 'text-sky-700', bg: 'bg-sky-100', icon: '💎', gradient: 'from-sky-500 to-cyan-400' },
  featured: { color: 'text-violet-600', bg: 'bg-violet-50', icon: '⭐', gradient: 'from-violet-600 to-purple-500' },
  standard: { color: 'text-gray-700', bg: 'bg-gray-100', icon: '✨', gradient: 'from-gray-500 to-gray-400' },
};

const PromotionHistoryModal: React.FC<PromotionHistoryModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
}) => {
  const [history, setHistory] = useState<PromotionHistoryItem[]>([]);
  const [totals, setTotals] = useState({
    totalPromotions: 0,
    totalSpent: 0,
    totalDaysPromoted: 0,
    totalViews: 0,
    totalInquiries: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && propertyId) {
      fetchHistory();
    }
  }, [isOpen, propertyId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.getPromotionHistory(propertyId);
      setHistory(result.history || []);
      setTotals(result.totals || {
        totalPromotions: 0,
        totalSpent: 0,
        totalDaysPromoted: 0,
        totalViews: 0,
        totalInquiries: 0,
      });
    } catch (err: any) {
      // Error removed
      setError(err.message || 'Failed to load promotion history');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-dark p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <ChartBarIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Promotion History</h2>
                  <p className="text-white/80 text-sm truncate max-w-xs">{propertyTitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-neutral-100 rounded-xl p-4 h-24" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500">{error}</p>
                <button
                  onClick={fetchHistory}
                  className="mt-4 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{totals.totalPromotions}</div>
                    <div className="text-xs text-blue-600/70">Promotions</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{totals.totalDaysPromoted}</div>
                    <div className="text-xs text-green-600/70">Days Promoted</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{totals.totalViews}</div>
                    <div className="text-xs text-purple-600/70">Views Generated</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-amber-600">{totals.totalInquiries}</div>
                    <div className="text-xs text-amber-600/70">Inquiries</div>
                  </div>
                </div>

                {/* Total Spent */}
                <div className="bg-neutral-50 rounded-xl p-4 mb-6 flex items-center justify-between">
                  <span className="text-neutral-600 font-medium">Total Spent on Promotions</span>
                  <span className="text-xl font-bold text-neutral-800">€{totals.totalSpent.toFixed(2)}</span>
                </div>

                {/* History List */}
                {history.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <p>No promotion history found for this property.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-neutral-700 mb-2">Promotion Timeline</h3>
                    {history.map((item, index) => {
                      const tierConfig = TIER_CONFIG[item.tier] || TIER_CONFIG.standard;
                      return (
                        <div
                          key={item._id}
                          className={`rounded-xl border-2 p-4 transition-all ${
                            item.isActive
                              ? 'border-green-300 bg-green-50/50'
                              : 'border-neutral-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${tierConfig.bg} ${tierConfig.color} text-sm font-semibold`}>
                                <span>{tierConfig.icon}</span>
                                <span>{item.tierInfo?.name || item.tier}</span>
                              </span>
                              {item.hasUrgentBadge && (
                                <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">
                                  🔥 Urgent
                                </span>
                              )}
                              {item.isActive && (
                                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                                  Active
                                </span>
                              )}
                              {item.isFromAgencyAllocation && (
                                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
                                  Agency
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-neutral-800">
                                {item.price === 0 ? 'Free' : `€${item.price.toFixed(2)}`}
                              </div>
                              <div className="text-xs text-neutral-500">{item.duration} days</div>
                            </div>
                          </div>

                          {/* Dates */}
                          <div className="flex items-center gap-4 text-sm text-neutral-600 mb-3">
                            <div className="flex items-center gap-1">
                              <ClockIcon className="w-4 h-4" />
                              <span>{new Date(item.startDate).toLocaleDateString()}</span>
                              <span className="text-neutral-400">→</span>
                              <span>{new Date(item.endDate).toLocaleDateString()}</span>
                            </div>
                            {item.isActive && (
                              <span className="text-green-600 font-medium">
                                {item.daysRemaining} days left
                              </span>
                            )}
                          </div>

                          {/* Performance */}
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-blue-600">
                              <EyeIcon className="w-4 h-4" />
                              <span>{item.performance.views} views</span>
                            </div>
                            <div className="flex items-center gap-1 text-green-600">
                              <InquiriesIcon className="w-4 h-4" />
                              <span>{item.performance.inquiries} inquiries</span>
                            </div>
                            <div className="flex items-center gap-1 text-amber-600">
                              <HeartIcon className="w-4 h-4" />
                              <span>{item.performance.saves} saves</span>
                            </div>
                          </div>

                          {/* Auto-extend indicator */}
                          {item.autoExtend && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600">
                              <span>🔄</span>
                              <span>Auto-extend enabled</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionHistoryModal;

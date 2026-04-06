import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@/constants';
import { getCityMarketData, CityMarketData } from '@/services/apiService';

interface MarketReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    city: string;
    country: string;
    agentName: string;
    onContactAgent: () => void;
}

const trendIcon: Record<string, string> = {
    rising: '\u2191',
    stable: '\u2192',
    declining: '\u2193',
};

const trendColor: Record<string, string> = {
    rising: 'text-green-600 bg-green-50',
    stable: 'text-blue-600 bg-blue-50',
    declining: 'text-red-600 bg-red-50',
};

const MarketReportModal: React.FC<MarketReportModalProps> = ({
    isOpen,
    onClose,
    city,
    country,
    agentName,
    onContactAgent,
}) => {
    const { t } = useTranslation(['agents']);
    const [marketData, setMarketData] = useState<CityMarketData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !city || !country) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getCityMarketData(city, country);
                setMarketData(data);
            } catch {
                setError(t('profilePage.marketReport.noData', 'Market data is not available for this area yet.'));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, city, country, t]);

    if (!isOpen) return null;

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
        }).format(price);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
                    <div>
                        <h2 className="text-lg font-bold text-white">
                            {t('profilePage.marketReport.title', 'Market Report')}
                        </h2>
                        <p className="text-blue-100 text-sm">
                            {city}, {country}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors p-1"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {error && !loading && (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-4">{error}</p>
                            <button
                                onClick={onContactAgent}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors"
                            >
                                {t('profilePage.marketReport.contactAgent', { name: agentName, defaultValue: `Contact ${agentName} for a report` })}
                            </button>
                        </div>
                    )}

                    {marketData && !loading && (
                        <>
                            {/* Market Trend Badge */}
                            <div className="flex items-center gap-2 mb-5">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${trendColor[marketData.marketTrend] || trendColor.stable}`}>
                                    {trendIcon[marketData.marketTrend] || trendIcon.stable}
                                    {' '}
                                    {marketData.marketTrend.charAt(0).toUpperCase() + marketData.marketTrend.slice(1)} Market
                                </span>
                                {marketData.lastUpdated && (
                                    <span className="text-xs text-gray-400">
                                        Updated {new Date(marketData.lastUpdated).toLocaleDateString('en-GB')}
                                    </span>
                                )}
                            </div>

                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                                    <div className="text-xs text-purple-600 font-medium mb-1">
                                        {t('profilePage.marketReport.avgPricePerSqm', 'Avg. Price/m\u00B2')}
                                    </div>
                                    <div className="text-lg font-bold text-purple-800">
                                        {formatPrice(marketData.avgPricePerSqm)}
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                                    <div className="text-xs text-blue-600 font-medium mb-1">
                                        {t('profilePage.marketReport.medianPrice', 'Median Price')}
                                    </div>
                                    <div className="text-lg font-bold text-blue-800">
                                        {formatPrice(marketData.medianPrice)}
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                                    <div className="text-xs text-green-600 font-medium mb-1">
                                        {t('profilePage.marketReport.priceGrowth', 'Price Growth (YoY)')}
                                    </div>
                                    <div className={`text-lg font-bold ${marketData.priceGrowthYoY >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                                        {marketData.priceGrowthYoY >= 0 ? '+' : ''}{marketData.priceGrowthYoY.toFixed(1)}%
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                                    <div className="text-xs text-orange-600 font-medium mb-1">
                                        {t('profilePage.marketReport.avgDaysOnMarket', 'Avg. Days on Market')}
                                    </div>
                                    <div className="text-lg font-bold text-orange-800">
                                        {marketData.averageDaysOnMarket}
                                    </div>
                                </div>
                            </div>

                            {/* Investment Scores */}
                            <div className="flex gap-3 mb-5">
                                <div className="flex-1 p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                                    <div className="text-xs text-amber-600 font-medium mb-1">
                                        {t('profilePage.marketReport.demandScore', 'Demand')}
                                    </div>
                                    <div className="text-xl font-bold text-amber-800">{marketData.demandScore}/10</div>
                                </div>
                                <div className="flex-1 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                                    <div className="text-xs text-emerald-600 font-medium mb-1">
                                        {t('profilePage.marketReport.rentalYield', 'Rental Yield')}
                                    </div>
                                    <div className="text-xl font-bold text-emerald-800">{marketData.rentalYield.toFixed(1)}%</div>
                                </div>
                                <div className="flex-1 p-3 rounded-xl bg-cyan-50 border border-cyan-100 text-center">
                                    <div className="text-xs text-cyan-600 font-medium mb-1">
                                        {t('profilePage.marketReport.investmentScore', 'Investment')}
                                    </div>
                                    <div className="text-xl font-bold text-cyan-800">{marketData.investmentScore}/10</div>
                                </div>
                            </div>

                            {/* Top Neighborhoods */}
                            {marketData.topNeighborhoods?.length > 0 && (
                                <div className="mb-5">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                        {t('profilePage.marketReport.topNeighborhoods', 'Top Neighborhoods')}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {marketData.topNeighborhoods.map((n) => (
                                            <span key={n} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                                                {n}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Highlights */}
                            {marketData.highlights?.length > 0 && (
                                <div className="mb-5">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                        {t('profilePage.marketReport.highlights', 'Market Highlights')}
                                    </h4>
                                    <ul className="space-y-1.5">
                                        {marketData.highlights.map((h, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                                <span className="text-blue-500 mt-0.5">&#8226;</span>
                                                {h}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Contact CTA */}
                            <button
                                onClick={onContactAgent}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm hover:shadow-md"
                            >
                                {t('profilePage.marketReport.personalizedReport', { name: agentName, defaultValue: `Get a personalized report from ${agentName}` })}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MarketReportModal;

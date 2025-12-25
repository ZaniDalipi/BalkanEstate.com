import React, { useState, useEffect } from 'react';
import { getFeaturedCities, CityMarketData as ApiCityMarketData } from '../../services/apiService';

interface MarketInsightsAnimationProps {
    city?: string;
    country?: string;
    propertyType?: string;
}

interface InsightCard {
    type: 'market' | 'tip' | 'stat' | 'trend';
    title: string;
    content: string;
    icon: string;
    highlight?: string;
    trend?: 'up' | 'down' | 'neutral';
}

const MarketInsightsAnimation: React.FC<MarketInsightsAnimationProps> = ({
    city,
    country,
    propertyType = 'apartment'
}) => {
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [cityData, setCityData] = useState<ApiCityMarketData | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch city market data on mount
    useEffect(() => {
        const fetchCityData = async () => {
            try {
                const cities = await getFeaturedCities(36);

                if (cities.length === 0) {
                    setLoading(false);
                    return;
                }

                // If city is provided, try to find matching city
                if (city) {
                    const matchingCity = cities.find(c =>
                        c.city.toLowerCase() === city.toLowerCase() ||
                        c.city.toLowerCase().includes(city.toLowerCase())
                    );
                    if (matchingCity) {
                        setCityData(matchingCity);
                        setLoading(false);
                        return;
                    }
                }

                // Otherwise, pick a random major city (top 12 featured cities)
                const topCities = cities.slice(0, 12);
                const randomCity = topCities[Math.floor(Math.random() * topCities.length)];
                setCityData(randomCity);
                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch city data:', error);
                setLoading(false);
            }
        };

        fetchCityData();
    }, [city]);

    // Default values if no data loaded
    const displayCity = cityData?.city || 'Belgrade';
    const avgPrice = cityData?.avgPricePerSqm || 1850;
    const daysToSell = cityData?.averageDaysOnMarket || 45;
    const yoyGrowth = cityData?.priceGrowthYoY || 12;
    const sellingSpeed = 20; // Default

    // Generate dynamic insights based on location and property type
    const insights: InsightCard[] = [
        {
            type: 'market',
            title: `${displayCity} Market Overview`,
            content: `Average price in ${displayCity}`,
            highlight: `€${avgPrice.toLocaleString()}/m²`,
            icon: '📊',
            trend: 'up'
        },
        {
            type: 'trend',
            title: 'Market Trends',
            content: 'Properties in your area are selling',
            highlight: `${sellingSpeed}% faster`,
            icon: '📈',
            trend: 'up'
        },
        {
            type: 'stat',
            title: 'Time on Market',
            content: 'Average days to sell',
            highlight: `${daysToSell} days`,
            icon: '⏱️',
            trend: 'neutral'
        },
        {
            type: 'tip',
            title: 'Pro Tip',
            content: 'Listings with professional photos sell 32% faster and for',
            highlight: '11% more',
            icon: '📸',
            trend: 'up'
        },
        {
            type: 'stat',
            title: 'Success Rate',
            content: 'Properties in your area sell within asking price',
            highlight: '89% of time',
            icon: '🎯',
            trend: 'up'
        },
        {
            type: 'tip',
            title: 'Best Practice',
            content: 'Adding a virtual tour increases buyer inquiries by',
            highlight: '67%',
            icon: '🏠',
            trend: 'up'
        },
        {
            type: 'market',
            title: 'Year Over Year',
            content: `${displayCity} property values`,
            highlight: yoyGrowth > 0 ? `+${yoyGrowth}%` : `${yoyGrowth}%`,
            icon: '💰',
            trend: yoyGrowth > 0 ? 'up' : yoyGrowth < 0 ? 'down' : 'neutral'
        },
        {
            type: 'tip',
            title: 'Pricing Strategy',
            content: 'Competitively priced properties receive first inquiry within',
            highlight: '3 days',
            icon: '💡',
            trend: 'neutral'
        }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentCardIndex((prev) => (prev + 1) % insights.length);
                setIsAnimating(false);
            }, 300);
        }, 4000);

        return () => clearInterval(interval);
    }, [insights.length]);

    const currentInsight = insights[currentCardIndex];

    const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
        switch (trend) {
            case 'up': return 'text-green-600';
            case 'down': return 'text-red-600';
            default: return 'text-blue-600';
        }
    };

    const getCardGradient = (type: string) => {
        switch (type) {
            case 'market': return 'from-blue-50 to-blue-100';
            case 'tip': return 'from-purple-50 to-purple-100';
            case 'stat': return 'from-green-50 to-green-100';
            case 'trend': return 'from-orange-50 to-orange-100';
            default: return 'from-gray-50 to-gray-100';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="w-full max-w-2xl bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-xl p-8 border-2 border-white animate-pulse">
                    <div className="h-8 bg-blue-200 rounded w-1/3 mb-6"></div>
                    <div className="h-6 bg-blue-200 rounded w-2/3 mb-4"></div>
                    <div className="h-16 bg-blue-200 rounded w-full"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-8 px-4">
            {/* Main Card */}
            <div
                className={`
                    w-full max-w-2xl bg-gradient-to-br ${getCardGradient(currentInsight.type)}
                    rounded-2xl shadow-xl p-8 border-2 border-white
                    transition-all duration-300 transform
                    ${isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}
                `}
            >
                {/* Icon and Type Badge */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">{currentInsight.icon}</span>
                        <span className="px-3 py-1 bg-white/60 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            {currentInsight.type}
                        </span>
                    </div>
                    {currentInsight.trend && (
                        <div className={`flex items-center gap-1 ${getTrendColor(currentInsight.trend)}`}>
                            {currentInsight.trend === 'up' && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            )}
                            {currentInsight.trend === 'down' && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                </svg>
                            )}
                        </div>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    {currentInsight.title}
                </h3>

                {/* Content */}
                <p className="text-lg text-gray-700 mb-4">
                    {currentInsight.content}
                </p>

                {/* Highlight */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
                    <p className={`text-4xl font-bold ${getTrendColor(currentInsight.trend)}`}>
                        {currentInsight.highlight}
                    </p>
                </div>
            </div>

            {/* Progress Indicators */}
            <div className="flex items-center gap-2 mt-6">
                {insights.map((_, index) => (
                    <div
                        key={index}
                        className={`
                            h-2 rounded-full transition-all duration-300
                            ${index === currentCardIndex ? 'w-8 bg-primary' : 'w-2 bg-gray-300'}
                        `}
                    />
                ))}
            </div>

            {/* Status Text */}
            <div className="mt-8 text-center">
                <h3 className="text-xl font-bold text-neutral-800 flex items-center justify-center gap-2">
                    <div className="relative">
                        <div className="w-2 h-2 bg-primary rounded-full animate-ping absolute"></div>
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                    Analyzing Your Property...
                </h3>
                <p className="text-neutral-600 mt-2 max-w-md mx-auto">
                    While our AI works, learn about the {displayCity} real estate market
                </p>
            </div>

            {/* Mini Stats Grid - Real data from Gemini */}
            <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-2xl">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
                    <div className="text-2xl font-bold text-primary">€{avgPrice.toLocaleString()}</div>
                    <div className="text-xs text-gray-600 mt-1">Avg. Price/m²</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
                    <div className="text-2xl font-bold text-green-600">{daysToSell}</div>
                    <div className="text-xs text-gray-600 mt-1">Days to Sell</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 text-center">
                    <div className={`text-2xl font-bold ${yoyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {yoyGrowth > 0 ? '+' : ''}{yoyGrowth}%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">YoY Growth</div>
                </div>
            </div>

            {/* Data source indicator */}
            {cityData && (
                <div className="mt-4 text-center">
                    <p className="text-xs text-neutral-500">
                        📊 Live market data powered by AI • Updated {new Date(cityData.lastUpdated).toLocaleDateString()}
                    </p>
                </div>
            )}
        </div>
    );
};

export default MarketInsightsAnimation;

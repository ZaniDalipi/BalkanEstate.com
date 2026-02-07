import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { getCurrencySymbol } from '@/utils/currency';

interface RentalDashboardStatsProps {
    properties: Property[];
}

const RentalDashboardStats: React.FC<RentalDashboardStatsProps> = ({ properties }) => {
    const { t } = useTranslation(['rental']);

    const stats = useMemo(() => {
        const rentals = properties.filter(p => p.listingType === 'rent');
        const activeRentals = rentals.filter(p => p.status === 'active');
        const rentedProperties = rentals.filter(p => p.status === 'rented');

        // Calculate total monthly income from rented properties
        const monthlyIncome = rentedProperties.reduce((sum, p) => {
            if (p.rentPeriod === 'weekly') return sum + p.price * 4.33;
            if (p.rentPeriod === 'daily') return sum + p.price * 30;
            return sum + p.price;
        }, 0);

        // Average rent of active listings
        const avgRent = activeRentals.length > 0
            ? activeRentals.reduce((sum, p) => sum + p.price, 0) / activeRentals.length
            : 0;

        // Total views across all rental properties
        const totalViews = rentals.reduce((sum, p) => sum + (p.views || 0), 0);
        const totalInquiries = rentals.reduce((sum, p) => sum + (p.inquiries || 0), 0);

        // Occupancy rate
        const occupancyRate = rentals.length > 0
            ? (rentedProperties.length / rentals.length) * 100
            : 0;

        return {
            totalRentals: rentals.length,
            activeRentals: activeRentals.length,
            rentedCount: rentedProperties.length,
            monthlyIncome: Math.round(monthlyIncome),
            avgRent: Math.round(avgRent),
            totalViews,
            totalInquiries,
            occupancyRate: Math.round(occupancyRate),
        };
    }, [properties]);

    // Use EUR as default
    const currencySymbol = useMemo(() => {
        const rental = properties.find(p => p.listingType === 'rent');
        return rental ? getCurrencySymbol(rental.country) : '€';
    }, [properties]);

    if (stats.totalRentals === 0) return null;

    const fmt = (n: number) => new Intl.NumberFormat('de-DE').format(n);

    return (
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-xl p-4 sm:p-5 shadow-lg mb-4">
            <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
                <h3 className="text-sm font-bold text-white">{t('rental:dashboard.title', 'Rental Portfolio')}</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Monthly Income */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-[10px] text-blue-200 uppercase tracking-wide">{t('rental:dashboard.monthlyIncome', 'Monthly Income')}</p>
                    <p className="text-lg font-bold text-white mt-0.5">
                        {currencySymbol}{fmt(stats.monthlyIncome)}
                    </p>
                    <p className="text-[10px] text-blue-300">
                        {stats.rentedCount} {t('rental:dashboard.rented', 'rented')}
                    </p>
                </div>

                {/* Active Listings */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-[10px] text-blue-200 uppercase tracking-wide">{t('rental:dashboard.activeListings', 'Available')}</p>
                    <p className="text-lg font-bold text-white mt-0.5">{stats.activeRentals}</p>
                    <p className="text-[10px] text-blue-300">
                        {t('rental:dashboard.avgRent', 'avg')} {currencySymbol}{fmt(stats.avgRent)}/mo
                    </p>
                </div>

                {/* Occupancy Rate */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-[10px] text-blue-200 uppercase tracking-wide">{t('rental:dashboard.occupancy', 'Occupancy')}</p>
                    <p className="text-lg font-bold text-white mt-0.5">{stats.occupancyRate}%</p>
                    <div className="mt-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-400 rounded-full transition-all"
                            style={{ width: `${stats.occupancyRate}%` }}
                        />
                    </div>
                </div>

                {/* Engagement */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-[10px] text-blue-200 uppercase tracking-wide">{t('rental:dashboard.engagement', 'Engagement')}</p>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                        <p className="text-lg font-bold text-white">{fmt(stats.totalViews)}</p>
                        <p className="text-[10px] text-blue-300">{t('rental:dashboard.views', 'views')}</p>
                    </div>
                    <p className="text-[10px] text-blue-300">
                        {stats.totalInquiries} {t('rental:dashboard.inquiries', 'inquiries')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RentalDashboardStats;

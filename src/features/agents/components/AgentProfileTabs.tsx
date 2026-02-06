import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Agent } from '@/types';
import {
    UserIcon,
    HomeIcon,
    StarIcon,
    TrendingUpIcon,
    ShieldCheckIcon,
    CheckBadgeIcon,
    AcademicCapIcon,
    TrophyIcon,
    ChartBarIcon,
    ClockIcon,
    ArrowTrendingUpIcon,
    FireIcon,
    DocumentTextIcon,
    ArrowRightIcon,
    MapIcon,
    MapPinIcon,
    HomeModernIcon,
    BuildingLibraryIcon,
    BanknotesIcon,
    CheckCircleIcon,
    UserCircleIcon,
    ChatBubbleBottomCenterTextIcon,
    MagnifyingGlassIcon,
    PhoneIcon,
    EnvelopeIcon,
} from '@/constants';
import StarRating from '@/components/shared/StarRating';
import { formatPrice } from '@/utils/currency';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import PropertyCardSkeleton from '@/src/features/property-details/components/PropertyCardSkeleton';
import AgentReviewForm from '@/components/shared/AgentReviewForm';
import AchievementsSection from '@/components/shared/AchievementsSection';
import { Achievement } from '@/components/shared/AchievementsSection';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AgentStats, MarketInsights } from './useAgentProfile';

// Component to fix map rendering issues in dynamic containers
const MapInvalidator: React.FC = () => {
    const map = useMap();

    useEffect(() => {
        // Invalidate size after mount and when container might have changed
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);

        // Also invalidate on window resize
        const handleResize = () => map.invalidateSize();
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, [map]);

    return null;
};

interface AgentProfileTabsProps {
    agent: Agent;
    stats: AgentStats;
    marketInsights: MarketInsights;
    activeTab: 'overview' | 'listings' | 'reviews';
    setActiveTab: (tab: 'overview' | 'listings' | 'reviews') => void;
    activeListings: any[];
    soldProperties: any[];
    allAgentProperties: any[];
    loadingProperties: boolean;
    hasValidCoordinates: boolean;
    mapCardOpen: boolean;
    setMapCardOpen: (open: boolean) => void;
    isAgencyAgent: string | false | undefined;
    firstName: string;
    isOwner: boolean | null | undefined;
    canWriteReview: boolean | null | undefined;
    showReviewForm: boolean;
    setShowReviewForm: (show: boolean) => void;
    agentAchievements: Achievement[];
    onContactAgent: () => void;
    onSearchAllProperties: () => void;
    onRequestMarketReport: () => void;
    onViewProperty: (propertyId: string) => void;
}

const AgentProfileTabs: React.FC<AgentProfileTabsProps> = ({
    agent,
    stats,
    marketInsights,
    activeTab,
    setActiveTab,
    activeListings,
    soldProperties,
    allAgentProperties,
    loadingProperties,
    hasValidCoordinates,
    mapCardOpen,
    setMapCardOpen,
    isAgencyAgent,
    firstName,
    isOwner,
    canWriteReview,
    showReviewForm,
    setShowReviewForm,
    agentAchievements,
    onContactAgent,
    onSearchAllProperties,
    onRequestMarketReport,
    onViewProperty,
}) => {
    const { t } = useTranslation(['agents']);

    return (
        <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 mb-4 sm:mb-6 lg:mb-8 overflow-hidden sticky top-0 md:top-16 z-30">
            <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-2.5 sm:py-3 md:py-4 px-2 sm:px-3 md:px-6 text-center font-semibold transition-colors min-w-[80px] sm:min-w-[100px] ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                >
                    <div className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2">
                        <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        <span className="text-[11px] sm:text-xs md:text-sm lg:text-base">{t('profilePage.tabs.overview')}</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('listings')}
                    className={`flex-1 py-2.5 sm:py-3 md:py-4 px-2 sm:px-3 md:px-6 text-center font-semibold transition-colors min-w-[80px] sm:min-w-[100px] ${activeTab === 'listings' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                >
                    <div className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2">
                        <HomeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        <span className="text-[11px] sm:text-xs md:text-sm lg:text-base">{t('profilePage.tabs.listings')} ({activeListings.length})</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`flex-1 py-2.5 sm:py-3 md:py-4 px-2 sm:px-3 md:px-6 text-center font-semibold transition-colors min-w-[80px] sm:min-w-[100px] ${activeTab === 'reviews' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                >
                    <div className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2">
                        <StarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        <span className="text-[11px] sm:text-xs md:text-sm lg:text-base">{t('profilePage.tabs.reviews')} ({stats.reviews})</span>
                    </div>
                </button>
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6 lg:p-8">
                {activeTab === 'overview' && (
                    <div className="space-y-5 sm:space-y-6 lg:space-y-8">
                        {/* About Section */}
                        <div>
                            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 lg:mb-6 pb-2 sm:pb-3 border-b border-gray-200">
                                {t('profilePage.about.title', { name: firstName })}
                            </h2>
                            <div className="prose prose-sm sm:prose-base lg:prose-lg text-gray-700 leading-relaxed">
                                {agent.bio || (
                                    <p className="text-sm sm:text-base lg:text-lg">
                                        {firstName} is a dedicated real estate professional with {stats.yearsExperience} years of experience
                                        in the industry{isAgencyAgent && ` as part of the ${agent.agencyName} team`}.
                                        {firstName} specializes in helping clients achieve their real estate goals through
                                        expert market knowledge and personalized service.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Achievements Display - Public View */}
                        {agentAchievements.length > 0 && (
                            <div className="mt-6 sm:mt-8">
                                <AchievementsSection
                                    achievements={agentAchievements}
                                    isOwner={false}
                                    entityType="agent"
                                />
                            </div>
                        )}

                        {/* Performance Stats */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <TrendingUpIcon className="w-6 h-6 text-blue-600" />
                                {t('profilePage.performance.title')}
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                                    <div className="text-2xl font-bold text-blue-700">{stats.totalSales}</div>
                                    <div className="text-xs font-semibold text-blue-800">{t('profilePage.performance.sold')}</div>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                                    <div className="text-2xl font-bold text-green-700">{activeListings.length}</div>
                                    <div className="text-xs font-semibold text-green-800">{t('profilePage.performance.active')}</div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                                    <div className="text-2xl font-bold text-purple-700">{stats.rating.toFixed(1)}</div>
                                    <div className="text-xs font-semibold text-purple-800">{t('profilePage.performance.rating')}</div>
                                </div>
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                                    <div className="text-2xl font-bold text-orange-700">{stats.yearsExperience}+</div>
                                    <div className="text-xs font-semibold text-orange-800">{t('profilePage.performance.years')}</div>
                                </div>
                                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                                    <div className="text-2xl font-bold text-red-700">{stats.reviews}</div>
                                    <div className="text-xs font-semibold text-red-800">{t('profilePage.performance.reviews')}</div>
                                </div>
                                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                                    <div className="text-2xl font-bold text-indigo-700">{stats.teamMembers}</div>
                                    <div className="text-xs font-semibold text-indigo-800">{t('profilePage.performance.team')}</div>
                                </div>
                            </div>
                        </div>

                        {/* Credentials & Certifications */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
                                {t('profilePage.credentials.title')}
                            </h3>

                            <div className="space-y-4">
                                {/* Licensed Real Estate Agent */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-blue-600 text-white p-3 rounded-lg flex-shrink-0">
                                            <CheckBadgeIcon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 text-lg mb-1">{t('profilePage.credentials.licensedAgent')}</h4>
                                            <p className="text-blue-700 font-mono text-sm font-semibold">
                                                {agent.licenseNumber || `${agent.country?.substring(0, 2).toUpperCase() || 'XX'}-REA-${Math.floor(10000 + Math.random() * 90000)}`}
                                            </p>
                                            <p className="text-gray-600 text-sm mt-1">
                                                {t('profilePage.credentials.authorizedToPractice', { city: agent.city, country: agent.country })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Professional Certifications */}
                                <div className="bg-white border border-gray-200 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-green-100 text-green-600 p-3 rounded-lg flex-shrink-0">
                                            <AcademicCapIcon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 mb-2">{t('profilePage.credentials.professionalCertifications')}</h4>
                                            {agent.certifications && Array.isArray(agent.certifications) && agent.certifications.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {agent.certifications.map((cert, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                                                            <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                            <span>{cert}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-gray-600">{t('profilePage.credentials.memberOfAssociation')}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Awards & Recognition */}
                                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-amber-500 text-white p-3 rounded-lg flex-shrink-0">
                                            <TrophyIcon className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 mb-2">{t('profilePage.credentials.awardsRecognition')}</h4>
                                            {agent.awards && Array.isArray(agent.awards) && agent.awards.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {agent.awards.map((award, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-gray-700">
                                                            <StarIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 fill-amber-600" />
                                                            <span>{award}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-gray-600">{t('profilePage.credentials.noAwards')}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Local Market Insights */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <ChartBarIcon className="w-6 h-6 text-blue-600" />
                                {t('profilePage.marketInsights.title')}
                                {agent.city && <span className="text-sm font-normal text-gray-600 ml-2">({agent.city})</span>}
                            </h3>

                            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl p-4 sm:p-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 mb-6">
                                    {/* Avg Days on Market */}
                                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200 shadow-sm">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="bg-blue-100 p-2 rounded-lg">
                                                <ClockIcon className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium">{t('profilePage.marketInsights.avgDaysOnMarket')}</p>
                                                <p className="text-2xl font-bold text-gray-900">
                                                    {marketInsights.avgDaysOnMarket} <span className="text-sm font-normal text-gray-600">{t('profilePage.marketInsights.days')}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500">{t(marketInsights.daysDescription)}</p>
                                    </div>

                                    {/* Price Growth */}
                                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200 shadow-sm">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="bg-green-100 p-2 rounded-lg">
                                                <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium">{t('profilePage.marketInsights.priceGrowthYoY')}</p>
                                                <p className="text-2xl font-bold text-green-600">
                                                    +{marketInsights.priceGrowth}%
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500">{t(marketInsights.growthDescription)}</p>
                                    </div>

                                    {/* Market Activity */}
                                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200 shadow-sm">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="bg-purple-100 p-2 rounded-lg">
                                                <FireIcon className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium">{t('profilePage.marketInsights.marketActivity')}</p>
                                                <p className={`text-2xl font-bold ${
                                                    marketInsights.activityLevel === 'Very High' ? 'text-red-600' :
                                                    marketInsights.activityLevel === 'High' ? 'text-purple-600' :
                                                    marketInsights.activityLevel === 'Moderate' ? 'text-blue-600' :
                                                    'text-gray-600'
                                                }`}>
                                                    {t(`profilePage.marketInsights.activity.${marketInsights.activityLevel.toLowerCase().replace(' ', '')}`, marketInsights.activityLevel)}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500">{t(marketInsights.activityDescription)}</p>
                                    </div>
                                </div>

                                {/* Request Full Report Button */}
                                <button
                                    onClick={onRequestMarketReport}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
                                >
                                    <DocumentTextIcon className="w-5 h-5" />
                                    <span>{t('profilePage.marketInsights.requestFullReport')}</span>
                                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <p className="text-center text-xs text-gray-600 mt-3">
                                    {t('profilePage.marketInsights.getDetailedInsights', { city: agent.city })}
                                </p>
                            </div>
                        </div>

                        {/* Properties Map - Shows agent's active and sold properties */}
                        {allAgentProperties.length > 0 && allAgentProperties.some(p => p.lat && p.lng) && (
                            <div>
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <MapIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                    {t('profilePage.propertiesMap.title')}
                                    <span className="text-sm font-normal text-gray-600 ml-2">
                                        ({activeListings.length} {t('profilePage.propertiesMap.active')}, {soldProperties.length} {t('profilePage.propertiesMap.sold')})
                                    </span>
                                </h3>
                                <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200">
                                    <MapContainer
                                        center={allAgentProperties.filter(p => p.lat && p.lng)[0] ? [allAgentProperties.filter(p => p.lat && p.lng)[0].lat!, allAgentProperties.filter(p => p.lat && p.lng)[0].lng!] : [agent.lat || 42.0, agent.lng || 21.0]}
                                        zoom={12}
                                        scrollWheelZoom={true}
                                        className="w-full h-[400px] sm:h-[500px]"
                                        maxZoom={23}
                                        minZoom={3}
                                    >
                                        <TileLayer
                                            attribution='&copy; Google Maps'
                                            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                            maxZoom={22}
                                        />
                                        <MapInvalidator />
                                        {allAgentProperties.filter(p => p.lat && p.lng).map((property) => (
                                            <Marker
                                                key={property.id}
                                                position={[property.lat!, property.lng!]}
                                                icon={L.icon({
                                                    iconUrl: property.status === 'sold'
                                                        ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png'
                                                        : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                                                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                                    iconSize: [25, 41],
                                                    iconAnchor: [12, 41],
                                                    popupAnchor: [1, -34],
                                                    shadowSize: [41, 41]
                                                })}
                                            >
                                                <Popup>
                                                    <div className="min-w-[200px]">
                                                        {property.imageUrl && (
                                                            <img src={property.imageUrl} alt={property.address} className="w-full h-32 object-cover rounded-lg mb-2" loading="lazy" decoding="async" />
                                                        )}
                                                        <p className="font-bold text-sm mb-1">{property.address}</p>
                                                        <p className="text-xs text-gray-600 mb-2">{property.city}, {property.country}</p>
                                                        <p className="font-bold text-blue-600 mb-2">{formatPrice(property.price, property.country)}</p>
                                                        <div className="flex gap-2 text-xs text-gray-600 mb-3">
                                                            <span>{property.beds} {t('profilePage.propertiesMap.beds')}</span>
                                                            <span>•</span>
                                                            <span>{property.baths} {t('profilePage.propertiesMap.baths')}</span>
                                                            <span>•</span>
                                                            <span>{property.sqft} m²</span>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const propertyId = property.id || (property as any)._id;
                                                                onViewProperty(propertyId);
                                                            }}
                                                            className={`w-full text-white px-3 py-2 rounded-lg font-semibold text-sm ${property.status === 'sold' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                                                        >
                                                            {property.status === 'sold' ? t('profilePage.propertiesMap.viewSoldProperty') : t('profilePage.propertiesMap.viewDetails')}
                                                        </button>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </MapContainer>
                                </div>
                                <div className="mt-3 flex items-center justify-center gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                        <span className="text-gray-600">{t('profilePage.propertiesMap.forSale')} ({activeListings.length})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                                        <span className="text-gray-600">{t('profilePage.propertiesMap.soldLabel')} ({soldProperties.length})</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Agent Location Map - only show if coordinates are valid and within Balkans */}
                        {hasValidCoordinates && (
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <MapPinIcon className="w-6 h-6 text-blue-600" />
                                    {t('profilePage.serviceArea.title')}
                                </h3>
                                <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 relative">
                                    <MapContainer
                                        center={[agent.lat, agent.lng]}
                                        zoom={13}
                                        scrollWheelZoom={true}
                                        className="w-full h-80"
                                        maxZoom={23}
                                        minZoom={3}
                                    >
                                        <TileLayer
                                            attribution='&copy; Google Maps'
                                            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                            maxZoom={22}
                                        />
                                        <MapInvalidator />
                                        <Marker position={[agent.lat, agent.lng]} icon={L.icon({
                                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                            iconSize: [25, 41],
                                            iconAnchor: [12, 41],
                                            popupAnchor: [1, -34],
                                            shadowSize: [41, 41]
                                        })} eventHandlers={{ click: () => setMapCardOpen(!mapCardOpen) }}>
                                            <Popup>
                                                <div className="text-center min-w-[200px]">
                                                    {agent.avatarUrl && (
                                                        <div className="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden border-2 border-gray-300 flex-shrink-0">
                                                            <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                                                        </div>
                                                    )}
                                                    <p className="font-bold text-base mb-1">{agent.name}</p>
                                                    <p className="text-sm text-gray-600 mb-3">{agent.city}, {agent.country}</p>
                                                    {agent.phone && (
                                                        <a
                                                            href={`tel:${agent.phone}`}
                                                            className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-semibold mb-2 transition-colors text-sm"
                                                        >
                                                            <PhoneIcon className="w-4 h-4" />
                                                            Call
                                                        </a>
                                                    )}
                                                    {agent.email && (
                                                        <a
                                                            href={`mailto:${agent.email}`}
                                                            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors text-sm"
                                                        >
                                                            <EnvelopeIcon className="w-4 h-4" />
                                                            Email
                                                        </a>
                                                    )}
                                                </div>
                                            </Popup>
                                        </Marker>
                                    </MapContainer>

                                    {/* Card with Agent Info - shows on click */}
                                    <div className={`absolute inset-0 bg-gradient-to-t from-indigo-950/85 via-indigo-900/40 to-transparent transition-opacity duration-300 flex items-end p-6 ${mapCardOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMapCardOpen(false)}>
                                        <div className="w-full text-white text-center pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                                            {agent.avatarUrl && (
                                                <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-4 border-indigo-300 flex-shrink-0">
                                                    <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                                                </div>
                                            )}
                                            <p className="font-bold text-lg">{agent.name}</p>
                                            <p className="text-sm text-indigo-200 mb-3">{agent.city}, {agent.country}</p>
                                            {agent.email && (
                                                <p className="text-xs text-indigo-300 mb-4 truncate">{agent.email}</p>
                                            )}
                                            <div className="flex gap-2">
                                                {agent.phone && (
                                                    <a
                                                        href={`tel:${agent.phone}`}
                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors text-sm pointer-events-auto"
                                                    >
                                                        Call
                                                    </a>
                                                )}
                                                <a
                                                    href={`mailto:${agent.email}`}
                                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors text-sm pointer-events-auto"
                                                >
                                                    Email
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Specializations Grid */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-6">{t('profilePage.expertise.title')}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {agent.specializations && agent.specializations.length > 0 ? (
                                    agent.specializations.map((spec) => (
                                        <div key={spec} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors group hover:shadow-md">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                                    {spec.includes('Luxury') ? <TrophyIcon className="w-5 h-5 text-blue-600" /> :
                                                     spec.includes('Commercial') ? <BuildingLibraryIcon className="w-5 h-5 text-blue-600" /> :
                                                     spec.includes('Investment') ? <BanknotesIcon className="w-5 h-5 text-blue-600" /> :
                                                     <HomeModernIcon className="w-5 h-5 text-blue-600" />}
                                                </div>
                                                <span className="font-semibold text-gray-800">{spec}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 rounded-lg">
                                                    <HomeModernIcon className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <span className="font-semibold text-gray-800">{t('profilePage.expertise.residential')}</span>
                                            </div>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-100 rounded-lg">
                                                    <UserIcon className="w-5 h-5 text-green-600" />
                                                </div>
                                                <span className="font-semibold text-gray-800">{t('profilePage.expertise.firstTimeBuyers')}</span>
                                            </div>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-100 rounded-lg">
                                                    <BuildingLibraryIcon className="w-5 h-5 text-purple-600" />
                                                </div>
                                                <span className="font-semibold text-gray-800">{t('profilePage.expertise.propertyManagement')}</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Languages Section */}
                        {agent.languages && agent.languages.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">{t('profilePage.languages.title')}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {agent.languages.map((lang) => (
                                        <span key={lang} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                                            {lang}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'listings' && (
                    <div className="space-y-8">
                        {/* Listings Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    {t('profilePage.listingsTab.properties', { name: firstName })}
                                </h2>
                                <p className="text-gray-600">
                                    {t('profilePage.listingsTab.activeListingsCount', { active: activeListings.length, sold: soldProperties.length })}
                                </p>
                            </div>
                            <button
                                onClick={onSearchAllProperties}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
                            >
                                <MagnifyingGlassIcon className="w-5 h-5" />
                                {t('profilePage.listingsTab.searchAllProperties')}
                            </button>
                        </div>

                        {/* Active Listings */}
                        {loadingProperties ? (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profilePage.listingsTab.activeListings')}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <PropertyCardSkeleton />
                                    <PropertyCardSkeleton />
                                    <PropertyCardSkeleton />
                                </div>
                            </div>
                        ) : activeListings.length > 0 ? (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profilePage.listingsTab.activeListings')}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {activeListings.map(prop => (
                                        <PropertyCard key={prop.id} property={prop} />
                                    ))}
                                </div>
                            </div>
                        ) : soldProperties.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl">
                                <p className="text-gray-500">{t('profilePage.listingsTab.noListings', 'No listings available')}</p>
                            </div>
                        ) : null}


                        {soldProperties.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profilePage.listingsTab.soldProperties')} ({soldProperties.length})</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {soldProperties.map(prop => (
                                        <div key={prop.id} className="relative">
                                            <PropertyCard property={prop} />
                                            <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-lg z-10">
                                                {t('profilePage.listingsTab.soldBadge')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div className="space-y-8">
                        {/* Reviews Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="text-center md:text-left">
                                    <div className="text-5xl font-bold text-gray-900 mb-2">
                                        {agent.rating ? agent.rating.toFixed(1) : '0.0'}
                                        <span className="text-2xl text-gray-600 ml-2">/ 5.0</span>
                                    </div>
                                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                        <StarRating rating={agent.rating || 0} />
                                        <span className="text-gray-600">({stats.reviews} {t('profilePage.reviewsTab.verifiedReviews')})</span>
                                    </div>
                                    <p className="text-gray-700">
                                        {firstName} is rated as a {agent.rating && agent.rating >= 4.5 ? 'Top Performer' : 'Reliable'} Agent
                                    </p>
                                </div>

                                {canWriteReview && !showReviewForm && (
                                    <button
                                        onClick={() => setShowReviewForm(true)}
                                        className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-xl font-semibold transition-colors shadow-sm hover:shadow-md"
                                    >
                                        {t('profilePage.reviewsTab.writeReview')}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Review Form */}
                        {showReviewForm && canWriteReview && (
                            <div className="mb-8">
                                <AgentReviewForm
                                    agentId={agent.id}
                                    agentName={agent.name}
                                    agentProperties={activeListings}
                                    onContactAgent={onContactAgent}
                                    onReviewSubmitted={() => {
                                        setShowReviewForm(false);
                                        window.location.reload();
                                    }}
                                />
                            </div>
                        )}

                        {/* Reviews List */}
                        {agent.testimonials && agent.testimonials.length > 0 ? (
                            <div className="space-y-6">
                                {agent.testimonials.slice(0, 5).map((t, index) => (
                                    <div key={index} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-300 transition-colors">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                {t.userId?.avatarUrl ? (
                                                    <img
                                                        src={t.userId.avatarUrl}
                                                        alt={t.userId.name || t.clientName}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="w-12 h-12 rounded-full"
                                                    />
                                                ) : (
                                                    <UserCircleIcon className="w-12 h-12 text-gray-300" />
                                                )}
                                                <div>
                                                    <p className="font-bold text-gray-900">{t.userId?.name || t.clientName || 'Anonymous'}</p>
                                                    <p className="text-sm text-gray-600">Verified Buyer • {t.rating}.0</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-gray-500 text-sm">
                                                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    }) : 'Recently'}
                                                </div>
                                                <StarRating rating={t.rating || 0} />
                                            </div>
                                        </div>
                                        <p className="text-gray-700 text-lg italic mb-4">"{t.quote}"</p>
                                        {(t as any).response && (
                                            <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500">
                                                <div className="flex items-start gap-3">
                                                    <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                                                    <div>
                                                        <p className="font-semibold text-gray-900 mb-1">Response from {firstName}</p>
                                                        <p className="text-gray-700">{(t as any).response}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <StarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600 text-lg mb-2">{t('profilePage.reviewsTab.noReviews')}</p>
                                <p className="text-gray-500">{t('profilePage.reviewsTab.beFirstToReview', { name: firstName })}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentProfileTabs;

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Property, PropertyStatus, UserRole } from '../../types';
import { formatPrice } from '../../utils/currency';
import { useAppContext } from '../../context/AppContext';
import { useRealtimeProperties } from '../../src/features/properties/hooks';
import { EyeIcon, HeartIcon, InquiriesIcon, PencilIcon, SparklesIcon, CheckCircleIcon, ClockIcon, ArrowPathIcon, BuildingOfficeIcon, TrashIcon, CalendarIcon } from '../../constants';
import Modal from './Modal';
import ListingCardSkeleton from './ListingCardSkeleton';
import * as api from '../../services/apiService';
import PromotionModal from '../../src/features/promotions/components/PromotionModal';
import { VideoGenerator } from '../../src/features/videos';

// Video Icon component
const VideoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

// Role badge component to show which role created the listing
const RoleBadge: React.FC<{ role?: UserRole | string }> = ({ role }) => {
    if (!role) return null;

    const isAgent = role === 'agent' || role === UserRole.AGENT;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
            isAgent
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
        }`}>
            {isAgent ? (
                <>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
                    </svg>
                    Agent
                </>
            ) : (
                <>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                    </svg>
                    Private Seller
                </>
            )}
        </span>
    );
};

const StatusBadge: React.FC<{ status: PropertyStatus }> = ({ status }) => {
    const statusStyles: Record<string, { bg: string, text: string, icon?: React.ReactNode }> = {
        active: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircleIcon className="w-4 h-4"/> },
        draft: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <PencilIcon className="w-4 h-4" /> },
        pending: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <ClockIcon className="w-4 h-4" /> },
        sold: { bg: 'bg-neutral-200', text: 'text-neutral-700', icon: <CheckCircleIcon className="w-4 h-4" /> },
        rented: { bg: 'bg-orange-100', text: 'text-orange-800', icon: <CheckCircleIcon className="w-4 h-4" /> },
    };
    const style = statusStyles[status] || statusStyles.draft;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
            {style.icon}
            <span className="capitalize">{status}</span>
        </span>
    );
};

const ListingCard: React.FC<{
    property: Property,
    onRenew: (id: string) => void,
    onMarkAsSold: (id: string) => void,
    onMarkAsAvailable: (id: string) => void,
    onDelete: (id: string) => void,
    onPromote: (id: string) => void,
    onExtend: (id: string) => void,
    onVideo: (id: string) => void,
    renewalStatus: { canRenew: boolean; hoursRemaining?: number; minutesRemaining?: number } | null,
}> = ({ property, onRenew, onMarkAsSold, onMarkAsAvailable, onDelete, onPromote, onExtend, onVideo, renewalStatus }) => {
    const { dispatch } = useAppContext();
    const [imageError, setImageError] = useState(false);

    const handleCardClick = () => {
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: property.id });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'property-details' });
        window.history.pushState({ propertyId: property.id }, '', `/property/${property.id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Navigate to edit listing URL
        window.history.pushState({}, '', `/edit-listing/${property.id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const isActionable = property.status === 'active' || property.status === 'pending';
    const isPromoted = property.isPromoted && property.promotionEndDate && new Date(property.promotionEndDate) > new Date();

    // Check if can renew (24hr cooldown)
    const canRenew = renewalStatus?.canRenew ?? true;

    // Check if property has valid map coordinates
    const hasValidCoordinates = property.lat != null && !isNaN(property.lat) && property.lng != null && !isNaN(property.lng);

    return (
    <div className="bg-white p-4 rounded-xl border border-neutral-200 hover:shadow-lg transition-shadow duration-300 flex flex-col sm:flex-row gap-5">
        {/* Image container - fixed size with image fitted inside */}
        <button onClick={handleCardClick} className="block flex-shrink-0">
            <div className="w-full sm:w-56 h-44 bg-neutral-100 rounded-lg overflow-hidden flex items-center justify-center">
                {imageError ? (
                    <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
                        <BuildingOfficeIcon className="w-12 h-12 text-neutral-400" />
                    </div>
                ) : (
                    <img
                        src={property.imageUrl}
                        alt={property.address}
                        className="w-full h-full object-cover object-center"
                        onError={() => setImageError(true)}
                    />
                )}
            </div>
        </button>
        <div className="flex-grow flex flex-col">
            <div className="flex justify-between items-start">
                <div onClick={handleCardClick} className="cursor-pointer">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <StatusBadge status={property.status} />
                        <ListingTypeBadge listingType={property.listingType} />
                        <RoleBadge role={property.createdAsRole} />
                        {!hasValidCoordinates && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700" title="This property won't appear on the map. Edit to set location.">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                                </svg>
                                No Map Location
                            </span>
                        )}
                    </div>
                    {property.title && (
                        <p className="font-bold text-lg sm:text-xl text-neutral-900 mt-1 line-clamp-1">{property.title}</p>
                    )}
                    <p className={`font-bold ${property.title ? 'text-base' : 'text-lg sm:text-xl'} text-primary mt-1`}>{formatPrice(property.price, property.country)}</p>
                    <p className="text-sm text-neutral-600">{property.address}, {property.city}</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
                     <button onClick={handleEditClick} aria-label="Edit listing" className="p-2 text-neutral-500 bg-neutral-100 rounded-full hover:bg-neutral-200 hover:text-neutral-800 transition-colors">
                        <PencilIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(property.id); }} aria-label="Delete listing" className="p-2 text-red-500 bg-red-50 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors">
                        <TrashIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="flex-grow"></div>

            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-500 mt-3 pt-3 border-t">
                <div className="flex items-center gap-1.5" title="Views"><EyeIcon className="w-4 h-4" /> {property.views || 0}</div>
                <div className="flex items-center gap-1.5" title="Saves"><HeartIcon className="w-4 h-4" /> {property.saves || 0}</div>
                <div className="flex items-center gap-1.5" title="Inquiries"><InquiriesIcon className="w-4 h-4" /> {property.inquiries || 0}</div>
                {property.lastRenewed && isActionable && (
                    <div className="flex items-center gap-1.5 text-green-600" title="Last Renewed">
                        <CalendarIcon className="w-4 h-4"/>
                        <span className="text-xs font-medium">
                            {new Date(property.lastRenewed).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                )}
                {property.status === 'rented' && property.rentedUntil && (
                    <div className="flex items-center gap-1.5 text-orange-600" title="Rented until">
                        <CalendarIcon className="w-4 h-4"/>
                        <span className="text-xs font-medium">
                            Rented until {new Date(property.rentedUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                )}
            </div>

             <div className="flex flex-col sm:flex-row items-center gap-2 mt-4">
                {isPromoted ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onExtend(property.id); }}
                        disabled={!isActionable}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ClockIcon className="w-4 h-4" />
                        Extend Promotion
                    </button>
                ) : (
                    <button
                        onClick={(e) => { e.stopPropagation(); onPromote(property.id); }}
                        disabled={!isActionable}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg hover:from-violet-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        Promote
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); onVideo(property.id); }}
                    disabled={!property.images || property.images.length === 0}
                    title={property.images && property.images.length > 0 ? 'Create video reel' : 'Add images first'}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <VideoIcon className="w-4 h-4" />
                    {property.videoUrl ? 'Video' : 'Create Video'}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onRenew(property.id); }}
                    disabled={!isActionable || !canRenew}
                    title={!canRenew && renewalStatus ? `Can renew in ${renewalStatus.hoursRemaining}h ${renewalStatus.minutesRemaining}m` : 'Renew listing to appear at top'}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ArrowPathIcon className="w-4 h-4" />
                    {!canRenew && renewalStatus ? `${renewalStatus.hoursRemaining}h ${renewalStatus.minutesRemaining}m` : 'Renew'}
                </button>
                {property.status === 'rented' ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onMarkAsAvailable(property.id); }}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        Mark as Available
                    </button>
                ) : (
                    <button
                        onClick={(e) => { e.stopPropagation(); onMarkAsSold(property.id); }}
                        disabled={!isActionable}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCircleIcon className="w-4 h-4" />
                        {property.listingType === 'rent' ? 'Mark as Rented' : 'Mark as Sold'}
                    </button>
                )}
             </div>
        </div>
    </div>
);
};

const FilterPill: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    count?: number;
}> = ({ label, isActive, onClick, count }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 flex-grow text-center capitalize ${
            isActive
                ? 'bg-white text-primary shadow'
                : 'text-neutral-600 hover:bg-neutral-200'
        }`}
    >
        {label} {count !== undefined && <span className="text-xs opacity-70">({count})</span>}
    </button>
);


const ListingTypeBadge: React.FC<{ listingType?: string }> = ({ listingType }) => {
    const isRent = listingType === 'rent';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
            isRent ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
            {isRent ? (
                <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    For Rent
                </>
            ) : (
                <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    For Sale
                </>
            )}
        </span>
    );
};

const MyListings: React.FC<{ sellerId: string }> = ({ sellerId }) => {
    const { state, dispatch } = useAppContext();
    const [showSoldConfirm, setShowSoldConfirm] = useState(false);
    const [showRentedModal, setShowRentedModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [propertyToMarkSold, setPropertyToMarkSold] = useState<string | null>(null);
    const [rentedUntilDate, setRentedUntilDate] = useState('');
    const [showAvailableConfirm, setShowAvailableConfirm] = useState(false);
    const [propertyToMarkAvailable, setPropertyToMarkAvailable] = useState<string | null>(null);
    const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'all'>('all');
    const [roleFilter, setRoleFilter] = useState<'all' | 'private_seller' | 'agent'>('all');
    const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'sale' | 'rent'>('all');
    const [showPromotionModal, setShowPromotionModal] = useState(false);
    const [propertyToPromote, setPropertyToPromote] = useState<Property | null>(null);
    const [isExtensionMode, setIsExtensionMode] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [propertyForVideo, setPropertyForVideo] = useState<Property | null>(null);
    const [myProperties, setMyProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [renewalStatuses, setRenewalStatuses] = useState<Record<string, { canRenew: boolean; hoursRemaining?: number; minutesRemaining?: number }>>({});

    // Calculate renewal status based on lastRenewed
    const calculateRenewalStatus = (lastRenewed?: Date | number | string) => {
        if (!lastRenewed) return { canRenew: true };

        const COOLDOWN_HOURS = 24;
        const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
        const lastRenewedTime = new Date(lastRenewed).getTime();
        const now = Date.now();
        const timeSinceRenewal = now - lastRenewedTime;

        if (timeSinceRenewal >= cooldownMs) {
            return { canRenew: true };
        }

        const timeRemaining = cooldownMs - timeSinceRenewal;
        const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
        const minutesRemaining = Math.ceil((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

        return { canRenew: false, hoursRemaining, minutesRemaining };
    };

    // Refetch function - can be called manually or on view change
    const fetchMyListings = useCallback(async () => {
        setIsLoading(true);
        try {

            // Fetch ALL listings without role filter
            const listings = await api.getMyListings();

            setMyProperties(listings);

            // Calculate renewal statuses
            const statuses: Record<string, { canRenew: boolean; hoursRemaining?: number; minutesRemaining?: number }> = {};
            listings.forEach(p => {
                statuses[p.id] = calculateRenewalStatus(p.lastRenewed);
            });
            setRenewalStatuses(statuses);
        } catch (error) {
            setMyProperties([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Enable real-time updates via WebSocket
    // When any property is created/updated/deleted, refresh the list
    useRealtimeProperties({
        onPropertyCreated: () => {
            fetchMyListings();
        },
        onPropertyUpdated: () => {
            fetchMyListings();
        },
        onPropertyDeleted: () => {
            fetchMyListings();
        },
    });

    // Fetch on mount and when navigating back to this view (after editing)
    useEffect(() => {
        fetchMyListings();
    }, [state.activeView, fetchMyListings]); // Refetch when view changes (e.g., returning from edit-listing)

    // Update renewal statuses every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setRenewalStatuses(prev => {
                const updated: Record<string, { canRenew: boolean; hoursRemaining?: number; minutesRemaining?: number }> = {};
                myProperties.forEach(p => {
                    updated[p.id] = calculateRenewalStatus(p.lastRenewed);
                });
                return updated;
            });
        }, 60000);

        return () => clearInterval(interval);
    }, [myProperties]);

    // Calculate counts for each role
    const roleCounts = useMemo(() => {
        const privateSellerCount = myProperties.filter(p =>
            p.createdAsRole === 'private_seller'
        ).length;
        const agentCount = myProperties.filter(p =>
            p.createdAsRole === 'agent'
        ).length;
        return {
            all: myProperties.length,
            private_seller: privateSellerCount,
            agent: agentCount,
        };
    }, [myProperties]);

    // Calculate listing type counts
    const listingTypeCounts = useMemo(() => ({
        all: myProperties.length,
        sale: myProperties.filter(p => (p.listingType || 'sale') === 'sale').length,
        rent: myProperties.filter(p => p.listingType === 'rent').length,
    }), [myProperties]);

    const showListingTypeFilter = listingTypeCounts.sale > 0 && listingTypeCounts.rent > 0;

    const filteredAndSortedProperties = useMemo(() => {
        let filtered = myProperties;

        // Apply listing type filter
        if (listingTypeFilter !== 'all') {
            filtered = filtered.filter(p => (p.listingType || 'sale') === listingTypeFilter);
        }

        // Apply role filter
        if (roleFilter !== 'all') {
            filtered = filtered.filter(p => {
                if (roleFilter === 'private_seller') {
                    return p.createdAsRole === 'private_seller';
                }
                if (roleFilter === 'agent') {
                    return p.createdAsRole === 'agent';
                }
                return true;
            });
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(p => p.status === statusFilter);
        }

        // Helper to convert date/string/number to timestamp
        const toTimestamp = (value: any): number => {
            if (!value) return 0;
            if (typeof value === 'number') return value;
            if (typeof value === 'string') return new Date(value).getTime();
            if (value instanceof Date) return value.getTime();
            return 0;
        };

        return [...filtered].sort((a, b) => {
            // First sort by status (active first)
            const statusOrder = { active: 1, pending: 2, draft: 3, sold: 4 };
            const statusDiff = statusOrder[a.status] - statusOrder[b.status];
            if (statusDiff !== 0) return statusDiff;

            // Within same status, sort by lastRenewed/createdAt (newest first)
            const aRenewed = toTimestamp(a.lastRenewed);
            const aCreated = toTimestamp(a.createdAt);
            const bRenewed = toTimestamp(b.lastRenewed);
            const bCreated = toTimestamp(b.createdAt);

            const aTime = Math.max(aRenewed, aCreated);
            const bTime = Math.max(bRenewed, bCreated);
            return bTime - aTime;
        });
    }, [myProperties, statusFilter, roleFilter, listingTypeFilter]);

    const handleRenew = async (id: string) => {
        try {
            const result = await api.renewProperty(id);

            if (result.success) {
                // Update local state with new lastRenewed timestamp (as number for consistency)
                const newLastRenewedTimestamp = new Date(result.lastRenewed!).getTime();

                setMyProperties(prev => prev.map(p =>
                    p.id === id ? { ...p, lastRenewed: newLastRenewedTimestamp } : p
                ));

                // Update renewal status
                setRenewalStatuses(prev => ({
                    ...prev,
                    [id]: calculateRenewalStatus(new Date(newLastRenewedTimestamp)),
                }));

                // Dispatch to update global state - property will appear at top when sorted by newest
                dispatch({ type: 'RENEW_PROPERTY', payload: id });
            }
        } catch (error: any) {
            // Check for cooldown error - details are in error.details from apiRequest
            const errorDetails = error.details || error;
            if (error.code === 'RENEWAL_COOLDOWN' || errorDetails.code === 'RENEWAL_COOLDOWN') {
                // Update the status with the server response
                setRenewalStatuses(prev => ({
                    ...prev,
                    [id]: {
                        canRenew: false,
                        hoursRemaining: errorDetails.hoursRemaining,
                        minutesRemaining: errorDetails.minutesRemaining,
                    },
                }));
            }
        }
    };

    const handleMarkAsSoldClick = (id: string) => {
        const prop = myProperties.find(p => p.id === id);
        if (prop?.listingType === 'rent') {
            setPropertyToMarkSold(id);
            setRentedUntilDate('');
            setShowRentedModal(true);
        } else {
            setPropertyToMarkSold(id);
            setShowSoldConfirm(true);
        }
    };

    const confirmMarkAsRented = async () => {
        if (propertyToMarkSold) {
            const id = propertyToMarkSold;
            const until = rentedUntilDate ? new Date(rentedUntilDate).getTime() : undefined;
            // Close modal + update UI instantly
            setShowRentedModal(false);
            setPropertyToMarkSold(null);
            setRentedUntilDate('');
            setMyProperties(prev => prev.map(p =>
                p.id === id ? { ...p, status: 'rented' as PropertyStatus, rentedAt: Date.now(), rentedUntil: until } : p
            ));
            // Fire API in background
            try {
                await api.markPropertyAsRented(id, rentedUntilDate || undefined);
            } catch (error) {
                // Revert on failure
                setMyProperties(prev => prev.map(p =>
                    p.id === id ? { ...p, status: 'active' as PropertyStatus, rentedAt: undefined, rentedUntil: undefined } : p
                ));
            }
        }
    };

    const confirmMarkAsSold = async () => {
        if (propertyToMarkSold) {
            const id = propertyToMarkSold;
            // Close modal + update UI instantly
            setShowSoldConfirm(false);
            setPropertyToMarkSold(null);
            setMyProperties(prev => prev.map(p =>
                p.id === id ? { ...p, status: 'sold' as PropertyStatus } : p
            ));
            dispatch({ type: 'MARK_PROPERTY_SOLD', payload: id });
            // Fire API in background
            try {
                await api.markPropertyAsSold(id);
            } catch (error) {
                // Revert on failure
                setMyProperties(prev => prev.map(p =>
                    p.id === id ? { ...p, status: 'active' as PropertyStatus } : p
                ));
            }
        }
    };

    const handleMarkAsAvailableClick = (id: string) => {
        setPropertyToMarkAvailable(id);
        setShowAvailableConfirm(true);
    };

    const confirmMarkAsAvailable = async () => {
        if (propertyToMarkAvailable) {
            const id = propertyToMarkAvailable;
            // Close modal + update UI instantly
            setShowAvailableConfirm(false);
            setPropertyToMarkAvailable(null);
            setMyProperties(prev => prev.map(p =>
                p.id === id ? { ...p, status: 'active' as PropertyStatus, rentedAt: undefined, rentedUntil: undefined } : p
            ));
            // Fire API in background
            try {
                await api.markPropertyAsAvailable(id);
            } catch (error) {
                // Revert on failure
                setMyProperties(prev => prev.map(p =>
                    p.id === id ? { ...p, status: 'rented' as PropertyStatus } : p
                ));
            }
        }
    };

    const handleDeleteClick = (id: string) => {
        setPropertyToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (propertyToDelete) {
            try {
                const result = await api.deleteProperty(propertyToDelete);
                dispatch({ type: 'DELETE_PROPERTY', payload: propertyToDelete });

                // Update user's subscription counts if returned from backend
                if (result.updatedSubscription) {
                    dispatch({
                        type: 'UPDATE_USER',
                        payload: {
                            subscription: {
                                ...state.currentUser?.subscription,
                                ...result.updatedSubscription,
                            } as any
                        }
                    });
                }

                // Remove from local state
                setMyProperties(prev => prev.filter(p => p.id !== propertyToDelete));
            } catch (error) {
            }
        }
        setShowDeleteConfirm(false);
        setPropertyToDelete(null);
    };

    const handlePromote = (id: string) => {
        const property = myProperties.find(p => p.id === id);
        if (property) {
            setPropertyToPromote(property);
            setIsExtensionMode(false);
            setShowPromotionModal(true);
        }
    };

    const handleExtend = (id: string) => {
        const property = myProperties.find(p => p.id === id);
        if (property) {
            setPropertyToPromote(property);
            setIsExtensionMode(true);
            setShowPromotionModal(true);
        }
    };

    const handleVideo = (id: string) => {
        const property = myProperties.find(p => p.id === id);
        if (property) {
            setPropertyForVideo(property);
            setShowVideoModal(true);
        }
    };

    const handleVideoSuccess = () => {
        // Refresh properties to show updated video URL
        fetchMyListings();
    };

    const handlePromotionSuccess = async () => {
        // Refresh properties to show updated promotion status
        setShowPromotionModal(false);
        setPropertyToPromote(null);

        // Re-fetch listings to get updated promotion status
        try {
            const listings = await api.getMyListings();
            setMyProperties(listings);
        } catch (error) {
        }
    };

    const statusFilterOptions: { label: string, value: PropertyStatus | 'all' }[] = [
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Pending', value: 'pending' },
        { label: 'Sold', value: 'sold' },
        { label: 'Rented', value: 'rented' as PropertyStatus },
        { label: 'Draft', value: 'draft' },
    ];

    // Only show role filter if user has listings in both roles
    const showRoleFilter = roleCounts.private_seller > 0 && roleCounts.agent > 0;

    return (
        <div className="space-y-6">
            {/* Mark as Sold confirm */}
            <Modal
                isOpen={showSoldConfirm}
                onClose={() => setShowSoldConfirm(false)}
                title="Mark as Sold"
            >
                <p className="text-neutral-600 mb-6 text-center">
                    Are you sure you want to mark this property as sold? This action cannot be undone.
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => setShowSoldConfirm(false)} className="px-6 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100">Cancel</button>
                    <button onClick={confirmMarkAsSold} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Confirm</button>
                </div>
            </Modal>

            {/* Mark as Rented with date picker */}
            <Modal
                isOpen={showRentedModal}
                onClose={() => { setShowRentedModal(false); setPropertyToMarkSold(null); setRentedUntilDate(''); }}
                title="Mark as Rented"
            >
                <div className="space-y-4">
                    <p className="text-neutral-600 text-center text-sm">
                        Set the rental end date so tenants and visitors can see when the property becomes available again.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Rented Until</label>
                        <input
                            type="date"
                            value={rentedUntilDate}
                            onChange={(e) => setRentedUntilDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                        />
                        <p className="text-xs text-neutral-400 mt-1">Leave empty if the rental period is indefinite.</p>
                    </div>
                    <div className="flex justify-center gap-4 pt-2">
                        <button onClick={() => { setShowRentedModal(false); setPropertyToMarkSold(null); setRentedUntilDate(''); }} className="px-6 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100">Cancel</button>
                        <button onClick={confirmMarkAsRented} className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600">Mark as Rented</button>
                    </div>
                </div>
            </Modal>

            {/* Mark as Available confirm */}
            <Modal
                isOpen={showAvailableConfirm}
                onClose={() => { setShowAvailableConfirm(false); setPropertyToMarkAvailable(null); }}
                title="Mark as Available"
            >
                <p className="text-neutral-600 mb-6 text-center">
                    This will make the property active and visible to renters again. The listing will show as available from today.
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => { setShowAvailableConfirm(false); setPropertyToMarkAvailable(null); }} className="px-6 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100">Cancel</button>
                    <button onClick={confirmMarkAsAvailable} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Mark as Available</button>
                </div>
            </Modal>

            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Delete Listing"
            >
                <p className="text-neutral-600 mb-6 text-center">Are you sure you want to delete this listing? This action cannot be undone and the property will be permanently removed.</p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => setShowDeleteConfirm(false)} className="px-6 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100">Cancel</button>
                    <button onClick={confirmDelete} className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">Delete</button>
                </div>
            </Modal>

            {propertyToPromote && (
                <PromotionModal
                    isOpen={showPromotionModal}
                    onClose={() => {
                        setShowPromotionModal(false);
                        setPropertyToPromote(null);
                        setIsExtensionMode(false);
                    }}
                    propertyId={propertyToPromote.id}
                    propertyTitle={propertyToPromote.title || `${propertyToPromote.address}, ${propertyToPromote.city}`}
                    onSuccess={handlePromotionSuccess}
                    isExtension={isExtensionMode}
                    currentTier={propertyToPromote.promotionTier as 'featured' | 'highlight' | 'premium' | undefined}
                    currentEndDate={propertyToPromote.promotionEndDate ? new Date(propertyToPromote.promotionEndDate) : undefined}
                />
            )}

            {/* Video Generator Modal */}
            <Modal
                isOpen={showVideoModal && propertyForVideo !== null}
                onClose={() => {
                    setShowVideoModal(false);
                    setPropertyForVideo(null);
                }}
                title=""
                maxWidth="max-w-2xl"
            >
                {propertyForVideo && (
                    <VideoGenerator
                        property={propertyForVideo}
                        onVideoGenerated={handleVideoSuccess}
                        onClose={() => {
                            setShowVideoModal(false);
                            setPropertyForVideo(null);
                        }}
                    />
                )}
            </Modal>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">My Listings ({myProperties.length})</h3>
                <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                          dispatch({ type: 'SET_PROPERTY_TO_EDIT', payload: null });
                          window.history.pushState({}, '', '/create-listing');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                      className="flex-1 sm:flex-initial px-4 py-2.5 bg-primary text-white font-semibold rounded-lg shadow-sm hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <PencilIcon className="w-4 h-4"/>
                      <span>New Sale Listing</span>
                    </button>
                    <button
                      onClick={() => {
                          dispatch({ type: 'SET_PROPERTY_TO_EDIT', payload: null });
                          window.history.pushState({}, '', '/create-rental');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                      className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <PencilIcon className="w-4 h-4"/>
                      <span>New Rental Listing</span>
                    </button>
                </div>
            </div>

            {/* Listing Type Filter (Sale / Rent) */}
            {showListingTypeFilter && (
                <div className="flex items-center space-x-1 bg-gradient-to-r from-emerald-50 to-blue-50 p-1.5 rounded-full border border-neutral-200 self-start max-w-full sm:max-w-md">
                    <button
                        onClick={() => setListingTypeFilter('all')}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex-grow text-center ${
                            listingTypeFilter === 'all' ? 'bg-white text-neutral-800 shadow' : 'text-neutral-600 hover:bg-white/50'
                        }`}
                    >
                        All ({listingTypeCounts.all})
                    </button>
                    <button
                        onClick={() => setListingTypeFilter('sale')}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex-grow text-center ${
                            listingTypeFilter === 'sale' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-700 hover:bg-emerald-100'
                        }`}
                    >
                        For Sale ({listingTypeCounts.sale})
                    </button>
                    <button
                        onClick={() => setListingTypeFilter('rent')}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex-grow text-center ${
                            listingTypeFilter === 'rent' ? 'bg-blue-600 text-white shadow' : 'text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                        For Rent ({listingTypeCounts.rent})
                    </button>
                </div>
            )}

            {/* Role Filter - Only show if user has listings in both roles */}
            {showRoleFilter && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-sm text-neutral-600 mb-3 font-medium">Filter by posting role:</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setRoleFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                roleFilter === 'all'
                                    ? 'bg-white text-neutral-800 shadow-md'
                                    : 'bg-white/50 text-neutral-600 hover:bg-white/80'
                            }`}
                        >
                            All Listings ({roleCounts.all})
                        </button>
                        <button
                            onClick={() => setRoleFilter('private_seller')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                                roleFilter === 'private_seller'
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                            </svg>
                            Private Seller ({roleCounts.private_seller})
                        </button>
                        <button
                            onClick={() => setRoleFilter('agent')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                                roleFilter === 'agent'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
                            </svg>
                            Agent ({roleCounts.agent})
                        </button>
                    </div>
                </div>
            )}

            {/* Status Filter */}
            <div className="flex items-center space-x-1 bg-neutral-100 p-1 rounded-full border border-neutral-200 self-start max-w-full sm:max-w-lg overflow-x-auto">
                {statusFilterOptions.map(option => (
                    <FilterPill
                        key={option.value}
                        label={option.label}
                        isActive={statusFilter === option.value}
                        onClick={() => setStatusFilter(option.value)}
                    />
                ))}
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <ListingCardSkeleton />
                    <ListingCardSkeleton />
                    <ListingCardSkeleton />
                </div>
            ) : filteredAndSortedProperties.length > 0 ? (
                <div className="space-y-4">
                    {filteredAndSortedProperties.map(prop =>
                        <ListingCard
                            key={prop.id}
                            property={prop}
                            onRenew={handleRenew}
                            onMarkAsSold={handleMarkAsSoldClick}
                            onMarkAsAvailable={handleMarkAsAvailableClick}
                            onDelete={handleDeleteClick}
                            onPromote={handlePromote}
                            onExtend={handleExtend}
                            onVideo={handleVideo}
                            renewalStatus={renewalStatuses[prop.id] || null}
                        />
                    )}
                </div>
            ) : (
                <div className="text-center p-12 border-2 border-dashed rounded-lg bg-neutral-50">
                    {myProperties.length > 0 ? (
                         <>
                            <h4 className="text-xl font-semibold text-neutral-700">No Listings Found</h4>
                            <p className="text-neutral-500 mt-2">
                                No properties match the current filters.
                                {roleFilter !== 'all' && ` Try selecting "All Listings".`}
                                {statusFilter !== 'all' && ` Try selecting "All" status.`}
                            </p>
                        </>
                    ) : (
                        <>
                            <h4 className="text-xl font-semibold text-neutral-700">No Listings Yet</h4>
                            <p className="text-neutral-500 mt-2">Click "Add New Listing" to get started.</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyListings;

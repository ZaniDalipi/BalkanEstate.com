import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Property, PropertyStatus, UserRole } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useRealtimeProperties, useMyListingsInfinite } from '../../src/features/properties/hooks';
import { PencilIcon } from '../../constants';
import Modal from './Modal';
import ListingCardSkeleton from './ListingCardSkeleton';
import PromotionModal from '../../src/features/promotions/components/PromotionModal';
import { VideoGenerator } from '../../src/features/videos';
import { useUnfinishedListingDrafts } from '@/src/features/seller/hooks/useUnfinishedListingDrafts';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { useRouteView } from '@/src/app/router/useRouteView';
import { MyListingsFilters } from '@/src/features/seller/components/myListings/MyListingsFilters';
import { MyListingCard } from '@/src/features/seller/components/myListings/MyListingCard';
import { useMyListingMutations } from '@/src/features/seller/hooks/useMyListingMutations';
import { renewalStatusOf, type ListingActionId, type RenewalStatus } from '@/src/features/seller/utils/listingActions';
import { validateNotPastDate } from '@/src/shared/utils/validation';

const MyListings: React.FC<{ sellerId: string }> = ({ sellerId }) => {
    const { t } = useTranslation(['rental', 'common', 'seller', 'account']);
    const { state } = useAppContext();
    const [showSoldConfirm, setShowSoldConfirm] = useState(false);
    const [showRentedModal, setShowRentedModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [propertyToMarkSold, setPropertyToMarkSold] = useState<string | null>(null);
    const [rentedUntilDate, setRentedUntilDate] = useState('');
    const [showAvailableConfirm, setShowAvailableConfirm] = useState(false);
    const [propertyToMarkAvailable, setPropertyToMarkAvailable] = useState<string | null>(null);
    const [showReassignConfirm, setShowReassignConfirm] = useState(false);
    const [propertyToReassign, setPropertyToReassign] = useState<{ id: string; targetRole: 'agent' | 'private_seller' } | null>(null);
    const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'all'>('all');
    const [roleFilter, setRoleFilter] = useState<'all' | 'private_seller' | 'agent'>('all');
    const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'sale' | 'rent'>('all');
    const [propertyIdSearch, setPropertyIdSearch] = useState('');
    const [showPromotionModal, setShowPromotionModal] = useState(false);
    const [propertyToPromote, setPropertyToPromote] = useState<Property | null>(null);
    const [isExtensionMode, setIsExtensionMode] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [propertyForVideo, setPropertyForVideo] = useState<Property | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
    const [renewalStatuses, setRenewalStatuses] = useState<Record<string, RenewalStatus>>({});
    const [rentedUntilError, setRentedUntilError] = useState<string | null>(null);

    // Listings are loaded in chunks of 20 as the user scrolls; filtering,
    // search and sorting happen on the server
    const {
        listings: myProperties,
        counts,
        isLoading,
        isError: isLoadError,
        isFetchingNextPage: isLoadingMore,
        hasMore,
        fetchNextPage,
        refetch,
        setListings: setMyProperties,
        setCounts,
    } = useMyListingsInfinite({
        status: statusFilter,
        listingType: listingTypeFilter === 'all' ? undefined : listingTypeFilter,
        role: roleFilter === 'all' ? undefined : roleFilter,
        search: debouncedSearch,
    });
    const fetchMyListings = useCallback(() => { refetch(); }, [refetch]);
    const loadMore = useCallback(() => { fetchNextPage(); }, [fetchNextPage]);

    // Real-time updates re-read the list; it only ever shows what the server stores.
    const realtimeRefetch = fetchMyListings;

    // Enable real-time updates via WebSocket
    // When any property is created/updated/deleted, refresh the list
    useRealtimeProperties({
        onPropertyCreated: () => {
            realtimeRefetch();
        },
        onPropertyUpdated: () => {
            realtimeRefetch();
        },
        onPropertyDeleted: () => {
            realtimeRefetch();
        },
    });

    // Unfinished new listings kept on this device (see listingDraftStorage)
    const { drafts: localDrafts, discardDraft: discardLocalDraft } = useUnfinishedListingDrafts(state.currentUser?.id);

    const continueDraft = (kind: 'sale' | 'rent') => {
        navigate(kind === 'rent' ? paths.createRental() : paths.createListing());
    };

    // Debounce the search box so we don't hit the server on every keystroke
    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(propertyIdSearch.trim()), 300);
        return () => clearTimeout(timeout);
    }, [propertyIdSearch]);

    // Refresh when navigating back to this view (e.g., returning from edit-listing)
    const { view } = useRouteView();
    const previousViewRef = useRef(view);
    useEffect(() => {
        if (previousViewRef.current !== view) fetchMyListings();
        previousViewRef.current = view;
    }, [view, fetchMyListings]);

    // Renewal statuses: recalculated whenever listings change, and every minute
    useEffect(() => {
        const recalculate = () => {
            const now = Date.now();
            const updated: Record<string, RenewalStatus> = {};
            myProperties.forEach(p => {
                updated[p.id] = renewalStatusOf(p.lastRenewed, now);
            });
            setRenewalStatuses(updated);
        };
        recalculate();
        const interval = setInterval(recalculate, 60000);
        return () => clearInterval(interval);
    }, [myProperties]);

    // Counts across all of the user's listings (from the server, not just loaded chunks)
    const roleCounts = { all: counts.all, private_seller: counts.private_seller, agent: counts.agent };
    const listingTypeCounts = { all: counts.all, sale: counts.sale, rent: counts.rent };

    const showListingTypeFilter = listingTypeCounts.sale > 0 && listingTypeCounts.rent > 0;

    const filteredAndSortedProperties = useMemo(() => {
        let filtered = myProperties;

        // Apply search (property ID, title, address, city)
        if (propertyIdSearch.trim()) {
            const searchTerm = propertyIdSearch.trim().toLowerCase();
            filtered = filtered.filter(p =>
                p.propertyId?.toLowerCase().includes(searchTerm) ||
                p.title?.toLowerCase().includes(searchTerm) ||
                p.address?.toLowerCase().includes(searchTerm) ||
                p.city?.toLowerCase().includes(searchTerm)
            );
        }

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
            const statusOrder: Record<string, number> = { active: 1, pending: 2, rented: 3, draft: 4, sold: 5 };
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
    }, [myProperties, statusFilter, roleFilter, listingTypeFilter, propertyIdSearch]);

    // Infinite scroll: load the next chunk when the sentinel nears the viewport.
    // Re-created after each chunk so it keeps loading while the sentinel stays visible.
    useEffect(() => {
        const sentinel = loadMoreSentinelRef.current;
        if (!sentinel || !hasMore || isLoading || isLoadingMore) return;
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0]?.isIntersecting) loadMore();
            },
            { rootMargin: '600px 0px' }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, isLoading, isLoadingMore, myProperties.length, loadMore]);

    const mutations = useMyListingMutations({
        listings: myProperties,
        setListings: setMyProperties,
        setCounts,
        refetch: fetchMyListings,
    });

    const handleMarkAsSoldClick = (id: string) => {
        const prop = myProperties.find(p => p.id === id);
        setPropertyToMarkSold(id);
        if (prop?.listingType === 'rent') {
            setRentedUntilDate('');
            setRentedUntilError(null);
            setShowRentedModal(true);
        } else {
            setShowSoldConfirm(true);
        }
    };

    const closeRentedModal = () => {
        setShowRentedModal(false);
        setPropertyToMarkSold(null);
        setRentedUntilDate('');
        setRentedUntilError(null);
    };

    const confirmMarkAsRented = () => {
        if (!propertyToMarkSold) return;
        const check = validateNotPastDate(rentedUntilDate);
        if (check.isValid === false) {
            setRentedUntilError(t('rental:status.rentedUntilInvalid', 'Choose today or a later date, or leave it empty.'));
            return;
        }
        const id = propertyToMarkSold;
        const until = rentedUntilDate;
        closeRentedModal();
        void mutations.markRented(id, until);
    };

    const confirmMarkAsSold = () => {
        if (!propertyToMarkSold) return;
        const id = propertyToMarkSold;
        setShowSoldConfirm(false);
        setPropertyToMarkSold(null);
        void mutations.markSold(id);
    };

    const handleMarkAsAvailableClick = (id: string) => {
        setPropertyToMarkAvailable(id);
        setShowAvailableConfirm(true);
    };

    const confirmMarkAsAvailable = () => {
        if (!propertyToMarkAvailable) return;
        const id = propertyToMarkAvailable;
        setShowAvailableConfirm(false);
        setPropertyToMarkAvailable(null);
        void mutations.markAvailable(id);
    };

    // Whether the current user is allowed to post/reassign listings under an agency.
    // Mirrors the server-side eligibility check in reassignPropertyRole.
    const currentUser = state.currentUser;
    const canActAsAgent = !!currentUser && (
        currentUser.role === UserRole.AGENT ||
        (currentUser.availableRoles?.includes(UserRole.AGENT) ?? false) ||
        !!currentUser.agentId ||
        !!currentUser.licenseNumber ||
        !!currentUser.agencyId
    );

    const handleReassignRoleClick = (id: string) => {
        const prop = myProperties.find(p => p.id === id);
        if (!prop) return;
        const targetRole: 'agent' | 'private_seller' =
            prop.createdAsRole === UserRole.AGENT ? 'private_seller' : 'agent';
        setPropertyToReassign({ id, targetRole });
        setShowReassignConfirm(true);
    };

    const confirmReassignRole = () => {
        if (!propertyToReassign) return;
        const { id, targetRole } = propertyToReassign;
        setShowReassignConfirm(false);
        setPropertyToReassign(null);
        void mutations.reassign(id, targetRole);
    };

    const handleDeleteClick = (id: string) => {
        setPropertyToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        const id = propertyToDelete;
        setShowDeleteConfirm(false);
        setPropertyToDelete(null);
        if (id) void mutations.remove(id);
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

    const handleListingAction = (action: ListingActionId, id: string) => {
        const handlers: Record<ListingActionId, (listingId: string) => void> = {
            promote: handlePromote,
            extendPromotion: handleExtend,
            video: handleVideo,
            renew: (listingId) => { void mutations.renew(listingId); },
            moveToAgency: handleReassignRoleClick,
            moveToPrivate: handleReassignRoleClick,
            markSold: handleMarkAsSoldClick,
            markRented: handleMarkAsSoldClick,
            markAvailable: handleMarkAsAvailableClick,
        };
        handlers[action](id);
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
        fetchMyListings();
    };

    // Unfinished new listing kept on this device (see listingDraftStorage)
    const renderLocalDraft = (draft: typeof localDrafts[number]) => (
        <div key={draft.kind} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm">
            <div className="flex-1 text-amber-900">
                <p className="font-semibold">
                    {draft.kind === 'rent'
                        ? t('seller:draft.unfinishedRental', 'Unfinished rental listing')
                        : t('seller:draft.unfinishedSale', 'Unfinished sale listing')}
                    {draft.title && `: ${draft.title}`}
                </p>
                <p className="text-amber-800/80">
                    {t('seller:draft.keptUntil', 'Saved as a draft on this device until {{date}}.', {
                        date: new Date(draft.expiresAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
                    })}
                </p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => continueDraft(draft.kind)} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark">
                    {t('seller:draft.continue', 'Continue')}
                </button>
                <button onClick={() => discardLocalDraft(draft.kind)} className="px-4 py-2 border border-amber-300 text-amber-900 font-semibold rounded-lg hover:bg-amber-100">
                    {t('seller:draft.discard', 'Discard')}
                </button>
            </div>
        </div>
    );

    // Only show role filter if user has listings in both roles
    const showRoleFilter = roleCounts.private_seller > 0 && roleCounts.agent > 0;

    return (
        <div className="space-y-6">
            {/* Mark as Sold confirm */}
            <Modal
                isOpen={showSoldConfirm}
                onClose={() => setShowSoldConfirm(false)}
                title={t('rental:status.markAsSold')}
            >
                <p className="text-neutral-600 mb-6 text-center">
                    {t('seller:listings.confirmSold', 'Are you sure you want to mark this property as sold? This action cannot be undone.')}
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => setShowSoldConfirm(false)} className="px-6 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100">{t('common:cancel')}</button>
                    <button onClick={confirmMarkAsSold} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">{t('common:confirm')}</button>
                </div>
            </Modal>

            {/* Mark as Rented with date picker */}
            <Modal
                isOpen={showRentedModal}
                onClose={closeRentedModal}
                title={t('rental:status.markAsRented')}
            >
                <div className="space-y-4">
                    <p className="text-neutral-600 text-center text-sm">
                        {t('rental:status.markAsRentedDesc')}
                    </p>
                    <div>
                        <label htmlFor="rented-until" className="block text-sm font-medium text-neutral-700 mb-1">{t('rental:status.rentedUntilLabel')}</label>
                        <input
                            id="rented-until"
                            type="date"
                            value={rentedUntilDate}
                            onChange={(e) => { setRentedUntilDate(e.target.value); setRentedUntilError(null); }}
                            min={new Date().toISOString().split('T')[0]}
                            aria-invalid={rentedUntilError ? true : undefined}
                            aria-describedby={rentedUntilError ? 'rented-until-error' : undefined}
                            className={`w-full min-h-[44px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm ${rentedUntilError ? 'border-red-400' : 'border-neutral-300'}`}
                        />
                        {rentedUntilError && (
                            <p id="rented-until-error" role="alert" className="text-xs text-red-600 mt-1">{rentedUntilError}</p>
                        )}
                        <p className="text-xs text-neutral-400 mt-1">{t('rental:status.leaveEmptyHint')}</p>
                    </div>
                    <div className="flex justify-center gap-4 pt-2">
                        <button onClick={closeRentedModal} className="px-6 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100">{t('common:cancel')}</button>
                        <button onClick={confirmMarkAsRented} className="px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600">{t('rental:status.markAsRented')}</button>
                    </div>
                </div>
            </Modal>

            {/* Mark as Available confirm */}
            <Modal
                isOpen={showAvailableConfirm}
                onClose={() => { setShowAvailableConfirm(false); setPropertyToMarkAvailable(null); }}
                title={t('rental:status.markAsAvailable')}
            >
                <p className="text-neutral-600 mb-6 text-center">
                    {t('rental:status.markAsAvailableDesc')}
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => { setShowAvailableConfirm(false); setPropertyToMarkAvailable(null); }} className="px-6 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100">{t('common:cancel')}</button>
                    <button onClick={confirmMarkAsAvailable} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">{t('rental:status.markAsAvailable')}</button>
                </div>
            </Modal>

            {/* Reassign posting role (private <-> agency) confirm */}
            <Modal
                isOpen={showReassignConfirm}
                onClose={() => { setShowReassignConfirm(false); setPropertyToReassign(null); }}
                title={propertyToReassign?.targetRole === 'agent'
                    ? t('seller:myListings.moveToAgency', 'Move to Agency')
                    : t('seller:myListings.moveToPrivate', 'Move to Private')}
            >
                <p className="text-neutral-600 mb-6 text-center">
                    {propertyToReassign?.targetRole === 'agent'
                        ? (currentUser?.agencyName
                            ? t('seller:myListings.moveToAgencyConfirmNamed', 'Move this listing to "{{agency}}"? It will be shown under your agency with your agent details.', { agency: currentUser.agencyName })
                            : t('seller:myListings.moveToAgencyConfirm', 'Move this listing to your agency? It will be shown with your agent details.'))
                        : t('seller:myListings.moveToPrivateConfirm', 'Move this listing back to your private seller profile? Agency details will be removed from it.')}
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => { setShowReassignConfirm(false); setPropertyToReassign(null); }} className="px-6 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100">{t('common:cancel')}</button>
                    <button onClick={confirmReassignRole} className="px-6 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700">{t('common:confirm')}</button>
                </div>
            </Modal>

            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title={t('account:ui.myListings.deleteListing2', 'Delete Listing')}
            >
                <p className="text-neutral-600 mb-6 text-center">{t('account:ui.myListings.areYouSureYouWant', 'Are you sure you want to delete this listing? This action cannot be undone and the property will be permanently removed.')}</p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => setShowDeleteConfirm(false)} className="px-6 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100">{t('account:ui.myListings.cancel', 'Cancel')}</button>
                    <button onClick={confirmDelete} className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">{t('account:ui.myListings.delete', 'Delete')}</button>
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
                <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">{t('seller:myListings.titleWithCount', 'My Listings ({{count}})', { count: counts.all })}</h3>
                <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                          navigate(paths.createListing());
                      }}
                      className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 bg-primary text-white font-semibold rounded-lg shadow-sm hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <PencilIcon className="w-4 h-4"/>
                      <span>{t('seller:myListings.newSaleListing', 'New Sale Listing')}</span>
                    </button>
                    <button
                      onClick={() => {
                          navigate(paths.createRental());
                      }}
                      className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <PencilIcon className="w-4 h-4"/>
                      <span>{t('seller:myListings.newRentalListing', 'New Rental Listing')}</span>
                    </button>
                </div>
            </div>

            {/* Unfinished listings saved on this device (listed in the Drafts tab instead when it is open) */}
            {statusFilter !== 'draft' && localDrafts.map(renderLocalDraft)}

            <MyListingsFilters
                search={propertyIdSearch}
                onSearch={setPropertyIdSearch}
                status={statusFilter}
                onStatus={setStatusFilter}
                listingType={listingTypeFilter}
                onListingType={setListingTypeFilter}
                listingTypeCounts={showListingTypeFilter ? listingTypeCounts : null}
                role={roleFilter}
                onRole={setRoleFilter}
                roleCounts={showRoleFilter ? roleCounts : null}
            />

            {statusFilter === 'draft' && localDrafts.length > 0 && (
                <div className="space-y-4">{localDrafts.map(renderLocalDraft)}</div>
            )}

            {isLoadError ? (
                <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                    <p className="font-semibold text-red-800">{t('seller:myListings.loadError', "Your listings couldn't be loaded.")}</p>
                    <button
                        type="button"
                        onClick={fetchMyListings}
                        className="min-h-[44px] rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        {t('seller:myListings.actionError.retry', 'Try again')}
                    </button>
                </div>
            ) : isLoading ? (
                <div className="space-y-4">
                    <ListingCardSkeleton />
                    <ListingCardSkeleton />
                    <ListingCardSkeleton />
                </div>
            ) : filteredAndSortedProperties.length > 0 ? (
                <div className="space-y-4">
                    {filteredAndSortedProperties.map(prop =>
                        <MyListingCard
                            key={prop.id}
                            property={prop}
                            canReassignToAgency={canActAsAgent}
                            renewalStatus={renewalStatuses[prop.id] || null}
                            pendingTask={mutations.pending[prop.id] ?? null}
                            feedback={mutations.feedback[prop.id] ?? null}
                            onAction={handleListingAction}
                            onDelete={handleDeleteClick}
                            onDismissFeedback={mutations.dismiss}
                        />
                    )}
                    {hasMore && (
                        <div ref={loadMoreSentinelRef} className="flex justify-center py-4">
                            {isLoadingMore ? (
                                <ListingCardSkeleton />
                            ) : (
                                <button
                                    onClick={loadMore}
                                    className="px-6 py-2 border border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:bg-neutral-100 text-sm"
                                >
                                    {t('common:loadMore', 'Load more')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ) : hasMore ? (
                // Everything loaded so far was filtered out locally; fetch the next chunk
                <div ref={loadMoreSentinelRef} className="flex justify-center py-4">
                    <ListingCardSkeleton />
                </div>
            ) : statusFilter === 'draft' && localDrafts.length > 0 ? null : (
                <div className="text-center p-12 border-2 border-dashed rounded-lg bg-neutral-50">
                    {counts.all > 0 ? (
                         <>
                            <h4 className="text-xl font-semibold text-neutral-700">{t('account:ui.myListings.noListingsFound', 'No Listings Found')}</h4>
                            <p className="text-neutral-500 mt-2">
                                {t('account:ui.myListings.noPropertiesMatchTheCurrent', 'No properties match the current filters.')}
                                {roleFilter !== 'all' && t('account:ui.myListings.trySelectingAllListings', ' Try selecting "All Listings".')}
                                {statusFilter !== 'all' && t('account:ui.myListings.trySelectingAllStatus', ' Try selecting "All" status.')}
                            </p>
                        </>
                    ) : (
                        <>
                            <h4 className="text-xl font-semibold text-neutral-700">{t('account:ui.myListings.noListingsYet', 'No Listings Yet')}</h4>
                            <p className="text-neutral-500 mt-2">{t('account:ui.myListings.clickAddNewListingTo', 'Click "Add New Listing" to get started.')}</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default MyListings;

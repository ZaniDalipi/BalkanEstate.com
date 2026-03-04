import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { User } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, StarIcon, ArrowLeftIcon, UserCircleIcon, BellIcon, TrophyIcon, ChartBarIcon, HomeIcon, UsersIcon, XMarkIcon, ShieldCheckIcon, PencilIcon, SparklesIcon, UserGroupIcon, CalendarIcon, AcademicCapIcon, GlobeAltIcon, ChevronRightIcon } from '../constants';
import NotificationCenter from '../src/shared/components/NotificationCenter';
import PropertyCard from '../src/features/property-details/components/PropertyCard';
import PropertyCardSkeleton from '../src/features/property-details/components/PropertyCardSkeleton';
import AgencyJoinRequestsModal from './AgencyJoinRequestsModal';
import InvitationCodeModal from './InvitationCodeModal';
import FeaturedSubscriptionCard from './shared/FeaturedSubscriptionCard';
import FeaturedSubscriptionDialog from './shared/FeaturedSubscriptionDialog';
import DefaultAvatar from './shared/DefaultAvatar';
import UserAvatar from './shared/UserAvatar';
import { formatPrice } from '../utils/currency';
import { createJoinRequest, removeAgentFromAgency, addAgencyAdmin, removeAgencyAdmin, verifyInvitationCode, leaveAgency } from '../src/features/agencies/api';
import { Agency } from '../types';
import { socketService } from '../services/socketService';
import { tokenService } from '../src/shared/api/tokenService';
import { SEO, Breadcrumbs, generateAgencyBreadcrumbs } from '../src/components/seo';
import { useTrackView } from '../src/features/view-stats/hooks';
import { useConfirmation } from '../src/shared/hooks/useConfirmation';
import { useNotification } from '../src/shared/hooks/useNotification';
import Footer from './shared/Footer';
import AchievementsSection, { Achievement } from './shared/AchievementsSection';
import {
  getAgencyAchievements,
  addAgencyAchievement,
  updateAgencyAchievement,
  deleteAgencyAchievement
} from '../src/features/achievements/api/achievementApi';
import { API_URL } from '../src/shared/api/config';
import { csrfHeaders as _csrfHeaders, ensureCsrfToken as _ensureCsrf } from '../src/shared/api/httpClient';
import MapLocationPicker from '../src/features/seller/components/MapLocationPicker';
import { searchLocation } from '../services/osmService';
import { toggleAgencyFavorite, checkAgencyFavorite } from '../src/features/saved/api/savedApi';
import { SocialShare } from '../src/components/marketing/SocialShare';

// Map icon SVG for section headers
const MapIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

// Map invalidator component
const MapInvalidator: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

interface Agent {
  agentId: string;
  userId?: string;
  _id?: string;
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  avatarOptions?: string;
  gender?: 'male' | 'female' | 'other';
  rating?: number;
  totalSalesValue?: number;
  propertiesSold?: number;
  activeListings?: number;
  licenseNumber?: string;
  city?: string;
  country?: string;
  stats?: {
    totalSalesValue?: number;
    propertiesSold?: number;
    rating?: number;
    activeListings?: number;
  };
}

// Extended Agency type to include optional id and rating for compatibility
interface ExtendedAgency extends Agency {
  id?: string;
  rating?: number;
  promotionCoupons?: {
    monthly: number;
    available: number;
    used: number;
    rollover?: number;
    lastRefresh?: Date | string;
    codes?: Array<{
      code: string;
      tier: string;
      status: 'available' | 'used' | 'expired';
      validFrom: string;
      validUntil: string;
      used: boolean;
      usedAt?: string;
      usedBy?: { name: string; email: string } | null;
    }>;
  };
  agentCoupons?: {
    available: number;
    used: number;
    total: number;
    expired: number;
    coupons: any[];
  };
}

interface AgencyDetailPageProps {
  agency: ExtendedAgency;
}

// Gradient presets for agency banners
// `css` is used for rendering (immune to Tailwind build purge); `gradient` is the stored key
const GRADIENT_PRESETS = [
  { id: 'default', name: 'Ocean Blue',   gradient: 'from-blue-600 via-blue-700 to-indigo-900',   css: 'linear-gradient(135deg, #2563eb, #1d4ed8, #312e81)' },
  { id: 'sunset',  name: 'Sunset',       gradient: 'from-orange-500 via-pink-500 to-purple-600',  css: 'linear-gradient(135deg, #f97316, #ec4899, #9333ea)' },
  { id: 'forest',  name: 'Forest',       gradient: 'from-green-600 via-teal-600 to-cyan-700',     css: 'linear-gradient(135deg, #16a34a, #0d9488, #0e7490)' },
  { id: 'royal',   name: 'Royal Purple', gradient: 'from-purple-600 via-purple-700 to-indigo-900',css: 'linear-gradient(135deg, #9333ea, #7e22ce, #312e81)' },
  { id: 'fire',    name: 'Fire',         gradient: 'from-red-600 via-orange-600 to-yellow-500',   css: 'linear-gradient(135deg, #dc2626, #ea580c, #eab308)' },
  { id: 'night',   name: 'Night Sky',    gradient: 'from-gray-900 via-blue-900 to-purple-900',    css: 'linear-gradient(135deg, #111827, #1e3a5f, #581c87)' },
  { id: 'mint',    name: 'Mint Fresh',   gradient: 'from-emerald-400 via-teal-500 to-cyan-600',   css: 'linear-gradient(135deg, #34d399, #14b8a6, #0891b2)' },
  { id: 'rose',    name: 'Rose Gold',    gradient: 'from-pink-400 via-rose-400 to-red-500',       css: 'linear-gradient(135deg, #f472b6, #fb7185, #ef4444)' },
];

const DEFAULT_GRADIENT_CSS = 'linear-gradient(135deg, #1e293b, #0f172a, #1e1b4b)';

// Resolve a stored coverGradient value (Tailwind class string or preset id) to a real CSS gradient
const resolveGradientCss = (stored?: string): string => {
  if (!stored) return DEFAULT_GRADIENT_CSS;
  const preset = GRADIENT_PRESETS.find(p => p.gradient === stored || p.id === stored);
  return preset?.css ?? DEFAULT_GRADIENT_CSS;
};

const AgencyDetailPage: React.FC<AgencyDetailPageProps> = ({ agency }) => {
  const { t } = useTranslation(['agencyDetails', 'nav', 'common']);
  const { state, dispatch } = useAppContext();
  const { currentUser, isAuthenticated } = state;
  const { confirm } = useConfirmation();
  const { success, error, warning, info } = useNotification();

  // Track page view for analytics
  useTrackView({
    entityType: 'agency',
    entityId: agency._id || agency.id,
    enabled: !!(agency._id || agency.id),
  });

  const [agents, setAgents] = useState<Agent[]>([]);
  const [agencyProperties, setAgencyProperties] = useState<any[]>([]);
  const [agencyAchievements, setAgencyAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoinRequestsModalOpen, setIsJoinRequestsModalOpen] = useState(false);
  const [joinRequestsRefreshKey, setJoinRequestsRefreshKey] = useState(0);
  const [pendingJoinRequestCount, setPendingJoinRequestCount] = useState(0);
  const [isInvitationCodeModalOpen, setIsInvitationCodeModalOpen] = useState(false);
  const [isFeaturedSubscriptionDialogOpen, setIsFeaturedSubscriptionDialogOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [agencyData, setAgencyData] = useState<ExtendedAgency>(agency);
  const [uploadError, setUploadError] = useState('');
  const [removingAgentId, setRemovingAgentId] = useState<string | null>(null);
  const [showAllMembers, setShowAllMembers] = useState(true);
  const [isLeavingAgency, setIsLeavingAgency] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingAgency, setIsSavingAgency] = useState(false);
  const [propertyView, setPropertyView] = useState<'active' | 'sold' | 'rented'>('active');
  const [propertyTypeView, setPropertyTypeView] = useState<'all' | 'sale' | 'rent'>('all');
  const [subscriptionKey, setSubscriptionKey] = useState(0);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [showCoverControls, setShowCoverControls] = useState(false);
  const [isFavourited, setIsFavourited] = useState(false);
  const [isTogglingFavourite, setIsTogglingFavourite] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [isRepositioningCover, setIsRepositioningCover] = useState(false);
  const [isRepositioningLogo, setIsRepositioningLogo] = useState(false);
  const [coverPos, setCoverPos] = useState<{ x: number; y: number }>({ x: agency.coverPosition?.x ?? 50, y: agency.coverPosition?.y ?? 50 });
  const [logoPos, setLogoPos] = useState<{ x: number; y: number }>({ x: agency.logoPosition?.x ?? 50, y: agency.logoPosition?.y ?? 50 });
  const [coverDragActive, setCoverDragActive] = useState(false);
  const [logoDragActive, setLogoDragActive] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const coverDragCounter = useRef(0);
  const logoDragCounter = useRef(0);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: '',
    zipCode: '',
    lat: 0,
    lng: 0,
    facebookUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
    twitterUrl: '',
    yearsInBusiness: 0,
    specialties: [] as string[],
    specializations: [] as string[],
    serviceAreas: [] as string[],
    certifications: [] as string[],
    languages: [] as string[],
    businessHours: {
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
    },
  });

  // Check if current user is owner - handle both populated and unpopulated ownerId
  const agencyOwnerId = typeof agencyData.ownerId === 'object' && agencyData.ownerId !== null
    ? (agencyData.ownerId as any)._id
    : agencyData.ownerId;
  const isOwner = currentUser && agencyOwnerId && (String(agencyOwnerId) === String(currentUser.id) || String(agencyOwnerId) === String(currentUser._id));

  // Check if current user is admin (owner or in admins array)
  const isAdmin = isOwner || (currentUser && agencyData.admins && agencyData.admins.some(adminId =>
    String(adminId) === String(currentUser.id) || String(adminId) === String(currentUser._id)
  ));

  // Check if current user is a platform-level admin or super admin
  const isPlatformAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Check if current user is already a member of this agency
  const isAlreadyMember = currentUser && agents.some(agent => {
    // Check multiple possible ID fields
    const agentUserId = agent.userId || agent.agentId || agent._id || agent.id;
    const currentUserId = currentUser.id || currentUser._id;
    return String(agentUserId) === String(currentUserId);
  });

  // Check if user's agency matches this agency
  const isUserInThisAgency = currentUser && (
    currentUser.agencyId && String(currentUser.agencyId) === String(agencyData._id)
  );

  // Check if agent has an active Pro subscription (required to join an agency)
  const hasProSubscription = currentUser?.subscription?.tier === 'pro' &&
    (currentUser?.subscription?.status === 'active' || currentUser?.subscription?.status === 'trial');

  // Can request to join if: authenticated, is agent, not owner/admin, not already in ANY agency, and not already a member of THIS agency
  // Non-Pro agents can still join via coupon codes (which grant Pro), so we don't require Pro here
  const canRequestToJoin = isAuthenticated &&
    currentUser?.role === 'agent' &&
    !isOwner &&
    !isAdmin &&
    !currentUser?.agencyId &&
    !isAlreadyMember &&
    !isUserInThisAgency;

  // Global nav handlers (integrated from floating header)
  const handleAccountClick = useCallback(() => {
    if (isAuthenticated) {
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
      window.history.pushState({}, '', '/account');
    } else {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
    }
  }, [isAuthenticated, dispatch]);

  const handleNewListingClick = useCallback(() => {
    if (isAuthenticated) {
      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
      dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
      window.history.pushState({}, '', '/create-listing');
    } else {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'signup' } });
    }
  }, [isAuthenticated, dispatch]);

  const handleSubscribeClick = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
    const currentLang = window.location.pathname.split('/')[1] || 'en';
    const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
    const lang = validLangs.includes(currentLang) ? currentLang : 'en';
    window.history.pushState({}, '', `/${lang}/subscribe`);
  }, [dispatch]);

  // Scroll to top on mount and when agency changes
  useEffect(() => {
    window.scrollTo(0, 0);
    fetchAgencyData();
  }, [agency._id]);

  // Fetch promotion coupon codes for agency members
  useEffect(() => {
    const fetchPromotionCouponCodes = async () => {
      if (!isAuthenticated || (!isAlreadyMember && !isUserInThisAgency && !isAdmin && !isPlatformAdmin)) return;
      const agencyId = agencyData._id || agencyData.id;
      if (!agencyId) return;
      try {
        const token = tokenService.getAccessToken();
        if (!token) return;
        const response = await fetch(`${API_URL}/agencies/${agencyId}/coupons`, {
          credentials: 'include',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.promotionCoupons?.codes) {
            setAgencyData(prev => ({
              ...prev,
              promotionCoupons: {
                ...prev.promotionCoupons,
                monthly: data.promotionCoupons.monthly ?? prev.promotionCoupons?.monthly ?? 0,
                available: data.promotionCoupons.available ?? prev.promotionCoupons?.available ?? 0,
                used: data.promotionCoupons.used ?? prev.promotionCoupons?.used ?? 0,
                codes: data.promotionCoupons.codes,
              },
            }));
          }
        }
      } catch {
        // Silently fail - codes are supplementary
      }
    };
    fetchPromotionCouponCodes();
  }, [agencyData._id, isAuthenticated, isAlreadyMember, isUserInThisAgency, isAdmin, isPlatformAdmin]);

  // Listen for real-time agency updates (new members, join requests, etc.)
  useEffect(() => {
    const handleAgencyUpdate = (data: any) => {
      if (data.type === 'member-added' || data.type === 'member-removed') {
        // Silently refetch agency data to get the updated member list (no loading spinner)
        fetchAgencyData(true);
      }
      if (data.type === 'join-request-new') {
        // New join request received — update badge count and refresh modal data
        setPendingJoinRequestCount(prev => prev + 1);
        setJoinRequestsRefreshKey(prev => prev + 1);
        if (isOwner || isAdmin) {
          setIsJoinRequestsModalOpen(true);
        }
      }
    };

    const unsubscribe = socketService.onAgencyUpdate(agency._id, handleAgencyUpdate);

    return () => {
      unsubscribe();
    };
  }, [agency._id, isOwner, isAdmin]);

  // Listen for coupon usage events to update the promotion coupons card immediately
  useEffect(() => {
    const handleCouponUsed = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.promotionCoupons) {
        setAgencyData(prev => ({
          ...prev,
          promotionCoupons: {
            ...prev.promotionCoupons,
            available: detail.promotionCoupons.available ?? prev.promotionCoupons?.available ?? 0,
            used: detail.promotionCoupons.used ?? prev.promotionCoupons?.used ?? 0,
            monthly: detail.promotionCoupons.monthly ?? prev.promotionCoupons?.monthly ?? 0,
          },
        }));
      }
    };
    window.addEventListener('agency-coupon-used', handleCouponUsed);

    // Also re-fetch coupon data when the page regains focus (in case coupons were used on another page)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && agencyData.promotionCoupons) {
        const agencyId = agencyData._id || agencyData.id;
        if (!agencyId) return;
        const token = tokenService.getAccessToken();
        if (!token) return;
        fetch(`${API_URL}/agencies/${agencyId}/coupons`, {
          credentials: 'include',
          headers: { 'Authorization': `Bearer ${token}` },
        }).then(r => r.ok ? r.json() : null).then(data => {
          if (data?.promotionCoupons) {
            setAgencyData(prev => ({
              ...prev,
              promotionCoupons: {
                ...prev.promotionCoupons,
                available: data.promotionCoupons.available ?? prev.promotionCoupons?.available ?? 0,
                used: data.promotionCoupons.used ?? prev.promotionCoupons?.used ?? 0,
                monthly: data.promotionCoupons.monthly ?? prev.promotionCoupons?.monthly ?? 0,
                codes: data.promotionCoupons.codes ?? prev.promotionCoupons?.codes,
              },
            }));
          }
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('agency-coupon-used', handleCouponUsed);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [agencyData._id, agencyData.id]);

  // Geocode when city/country changes in edit form to update marker position
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!isEditModalOpen) return;

    const city = editForm.city?.trim();
    const country = editForm.country?.trim();
    if (!city && !country) return;

    // Don't geocode if city/country haven't actually changed from the original
    if (city === (agencyData.city || '').trim() && country === (agencyData.country || '').trim()) return;

    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        const query = [city, country].filter(Boolean).join(', ');
        if (query.length < 3) return;

        const countryCodeMap: Record<string, string> = {
          'Serbia': 'RS', 'Kosovo': 'XK', 'Albania': 'AL', 'North Macedonia': 'MK',
          'Bosnia and Herzegovina': 'BA', 'Montenegro': 'ME', 'Croatia': 'HR',
          'Slovenia': 'SI', 'Bulgaria': 'BG', 'Romania': 'RO', 'Greece': 'GR',
        };
        const countryCode = country ? countryCodeMap[country] : undefined;
        const results = await searchLocation(query, countryCode);

        if (results.length > 0) {
          const best = results[0];
          setEditForm(prev => ({
            ...prev,
            lat: parseFloat(best.lat),
            lng: parseFloat(best.lon),
          }));
        }
      } catch {
        // Geocoding failed silently — user can still set location via map
      }
    }, 800);

    return () => {
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    };
  }, [editForm.city, editForm.country, isEditModalOpen]);

  // Check if agency is favourited on load
  useEffect(() => {
    if (!isAuthenticated || !agency._id) return;
    checkAgencyFavorite(agency._id)
      .then(setIsFavourited)
      .catch(() => {});
  }, [agency._id, isAuthenticated]);

  const handleToggleFavourite = useCallback(async () => {
    if (!isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
      return;
    }
    if (isTogglingFavourite) return;
    setIsTogglingFavourite(true);
    setIsFavourited(prev => !prev); // optimistic
    try {
      const result = await toggleAgencyFavorite(agency._id);
      setIsFavourited(result.isSaved);
    } catch {
      setIsFavourited(prev => !prev); // rollback
    } finally {
      setIsTogglingFavourite(false);
    }
  }, [agency._id, isAuthenticated, isTogglingFavourite, dispatch]);

  const fetchAgencyData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Fetch fresh agency data from the backend to get updated agents list and properties
      // Include auth token so backend can identify current user and auto-add owner as member
      const token = tokenService.getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/agencies/${agency._id}`, { credentials: 'include', headers });
      if (response.ok) {
        const data = await response.json();
        setAgencyData(data.agency);
        setAgents(data.agency.agents || []);
        setAgencyProperties(data.properties || []);
        // Set achievements from agency data or fetch separately
        if (data.agency.achievements) {
          setAgencyAchievements(data.agency.achievements);
        }
      } else {
        // Fallback to prop data if API fails
        setAgencyData(agency);
        setAgents(agency.agents || []);
        setAgencyProperties([]);
      }

      // Also try to fetch achievements separately if not in agency data
      try {
        const achievements = await getAgencyAchievements(agency._id || agency.id || '');
        setAgencyAchievements(achievements);
      } catch {
        // Achievements fetch failed, use what we have
      }
    } catch (_error) {
      // Fallback to prop data on error
      setAgencyData(agency);
      setAgents(agency.agents || []);
      setAgencyProperties([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Sort agents by performance - memoized to prevent recalculation on every render
  const rankedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      const scoreA = (a.stats?.totalSalesValue || 0) + (a.stats?.propertiesSold || 0) * 10000 + (a.stats?.rating || 0) * 5000;
      const scoreB = (b.stats?.totalSalesValue || 0) + (b.stats?.propertiesSold || 0) * 10000 + (b.stats?.rating || 0) * 5000;
      return scoreB - scoreA;
    });
  }, [agents]);

  // Memoized filtered properties to avoid recalculating on every render
  const { activeProperties, soldProperties, rentedProperties } = useMemo(() => {
    const active = agencyProperties.filter(p => p.status === 'active');
    const sold = agencyProperties.filter(p => p.status === 'sold');
    const rented = agencyProperties.filter(p => p.status === 'rented');
    return { activeProperties: active, soldProperties: sold, rentedProperties: rented };
  }, [agencyProperties]);

  // Properties with coordinates - memoized
  const propertiesWithCoords = useMemo(() => {
    return agencyProperties.filter(p => p.lat && p.lng);
  }, [agencyProperties]);

  // Calculate sales statistics - memoized (use backend data if available, otherwise calculate)
  const salesStats = useMemo(() => {
    const salesLast12Months = agencyData.salesStats?.salesLast12Months ?? soldProperties.filter(p => {
      if (!p.soldAt) return false;
      const twelveMonthsAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
      return p.soldAt >= twelveMonthsAgo;
    }).length;

    const totalSales = agencyData.salesStats?.totalSales ?? soldProperties.length;

    const prices = soldProperties.map(p => p.price).filter(Boolean);
    const minPrice = agencyData.salesStats?.minPrice ?? (prices.length > 0 ? Math.min(...prices) : 0);
    const maxPrice = agencyData.salesStats?.maxPrice ?? (prices.length > 0 ? Math.max(...prices) : 0);
    const averagePrice = agencyData.salesStats?.averagePrice ?? (prices.length > 0
      ? prices.reduce((sum, price) => sum + price, 0) / prices.length
      : 0);

    return { salesLast12Months, totalSales, minPrice, maxPrice, averagePrice };
  }, [agencyData.salesStats, soldProperties]);

  // Destructure for easier access
  const { salesLast12Months, totalSales, minPrice, maxPrice, averagePrice } = salesStats;

  const handleBack = () => {
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
    // Go back to the previous view (could be agencies or agents)
    // Check if we have a selected agent, if so go back to agents view
    if (state.selectedAgentId) {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agents' });
    } else {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
    }
  };

  const handleAgentClick = (agentDatabaseId: string) => {
    window.scrollTo(0, 0);
    // Find the agent in the list to get their agentId
    const agent = agents.find(a => (a.id || a._id) === agentDatabaseId);
    // Use agentId if available, fallback to database id
    const agentIdentifier = agent?.agentId || agentDatabaseId;
    // Clear selected agency first so App.tsx renders the agents view instead of agency detail
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
    dispatch({ type: 'SET_SELECTED_AGENT', payload: agentIdentifier });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agents' });
    window.history.pushState({}, '', `/agents/${agentIdentifier}`);
  };

  const handleRequestToJoin = () => {
    if (!canRequestToJoin) return;
    setIsInvitationCodeModalOpen(true);
  };

  const handleSubmitInvitationCode = async (code: string) => {
    try {
      const trimmedCode = code.trim().toUpperCase();

      // Check if this is an agent coupon (XXX-XXXXXXXX format, agency-prefixed) or invitation code (AGY-XXXXXX-XXXXXX format)
      const isAgentCoupon = !trimmedCode.startsWith('AGY-') && /^[A-Z0-9]{3}-[A-Z0-9]{8}$/.test(trimmedCode);

      if (isAgentCoupon) {
        // Redeem agent coupon for Pro subscription
        const token = tokenService.getAccessToken()?.trim();
        if (!token) {
          throw new Error('You are not logged in. Please log in and try again.');
        }
        await _ensureCsrf();
        const response = await fetch(`${API_URL}/agencies/coupons/redeem`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ..._csrfHeaders(),
          },
          body: JSON.stringify({ couponCode: trimmedCode }),
        });

        let data: any;
        try {
          data = await response.json();
        } catch {
          throw new Error('Unexpected response from server. Please try again.');
        }

        if (!response.ok) {
          switch (data?.code) {
            case 'INVALID_COUPON':
            case 'INVALID_COUPON_FORMAT':
              throw new Error('Invalid coupon code. Please check and try again.');
            case 'COUPON_ALREADY_USED':
              throw new Error('This coupon has already been used.');
            case 'COUPON_EXPIRED':
              throw new Error('This coupon has expired.');
            case 'AGENCY_SUBSCRIPTION_INACTIVE':
              throw new Error('The agency subscription is no longer active.');
            default:
              throw new Error(data?.message || 'Failed to redeem coupon.');
          }
        }

        // Update user context with new subscription data
        if (data?.subscription && data?.agency?.id) {
          dispatch({
            type: 'UPDATE_USER',
            payload: {
              subscription: {
                ...state.currentUser?.subscription,
                tier: data.subscription.tier,
                status: data.subscription.status,
                listingsLimit: data.subscription.listingsLimit,
                activeListingsCount: state.currentUser?.subscription?.activeListingsCount ?? 0,
                privateSellerCount: state.currentUser?.subscription?.privateSellerCount ?? 0,
                agentCount: state.currentUser?.subscription?.agentCount ?? 0,
                expiresAt: data.subscription.expiresAt,
              },
              agencyId: data.agency.id,
              agencyName: data.agency.name ?? '',
              agency: {
                agencyId: data.agency.id,
                role: data.agency.role ?? 'agent',
                joinedAt: new Date().toISOString(),
              },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          });

          // Refresh user data from server to ensure full sync
          try {
            const meResponse = await fetch(`${API_URL}/auth/me`, {
              credentials: 'include',
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (meResponse.ok) {
              const userData = await meResponse.json();
              if (userData?.user) {
                dispatch({ type: 'UPDATE_USER', payload: userData.user });
              }
            }
          } catch {
            // Non-critical: local state already updated above
          }
        }

        setIsInvitationCodeModalOpen(false);
        await success('Coupon Redeemed!', `You've joined ${data.agency?.name || agency.name} with a Pro subscription!`);

        // Silently refetch agency data so the new agent appears in the list immediately
        await fetchAgencyData(true);
      } else {
        // Handle invitation code (AGY-XXXXXX-XXXXXX format)
        const verification = await verifyInvitationCode(agency._id, trimmedCode);

        if (!verification.valid) {
          throw new Error(verification.message || 'Invalid invitation code');
        }

        // If code is valid, send join request with the code
        await createJoinRequest(agency._id, `Joining with invitation code: ${trimmedCode}`);
        setIsInvitationCodeModalOpen(false);
        await success(t('messages.requestSent', 'Request Sent'), 'Join request sent successfully! The agency admin will review your request.');
      }
    } catch (error) {
      throw error; // Let the modal handle the error display
    }
  };

  const handleToggleAdmin = async (agentId: string, agentName: string, isCurrentlyAdmin: boolean) => {
    if (!isOwner) {
      await warning(t('messages.accessDenied', 'Access Denied'), t('messages.onlyOwnerCanManage'));
      return;
    }

    const action = isCurrentlyAdmin ? t('confirmations.removeAdminRights') : t('confirmations.makeAdminRights');
    const confirmed = await confirm({
      title: isCurrentlyAdmin ? t('confirmations.removeAdminTitle', 'Remove Admin') : t('confirmations.makeAdminTitle', 'Make Admin'),
      message: t('confirmations.toggleAdmin', { action, name: agentName }),
      confirmLabel: isCurrentlyAdmin ? t('confirmations.removeButton', 'Remove') : t('confirmations.makeAdminButton', 'Make Admin'),
      cancelLabel: t('confirmations.cancelButton', 'Cancel'),
      type: isCurrentlyAdmin ? 'warning' : 'info',
    });

    if (!confirmed) return;

    try {
      if (isCurrentlyAdmin) {
        await removeAgencyAdmin(agencyData._id, agentId);
        setAgencyData(prev => ({
          ...prev,
          admins: prev.admins?.filter(id => id !== agentId) || []
        }));
        await success(t('messages.adminRemovedTitle', 'Admin Removed'), t('messages.adminRemoved', { name: agentName }));
      } else {
        await addAgencyAdmin(agencyData._id, agentId);
        setAgencyData(prev => ({
          ...prev,
          admins: [...(prev.admins || []), agentId]
        }));
        await success(t('messages.adminAddedTitle', 'Admin Added'), t('messages.adminAdded', { name: agentName }));
      }
    } catch (err) {
      await error(t('messages.errorTitle', 'Error'), err instanceof Error ? err.message : t('messages.onlyOwnerCanManage'));
    }
  };

  const handleRemoveAgent = async (agentId: string, agentName: string) => {
    if (!isAdmin) {
      await warning(t('messages.accessDenied', 'Access Denied'), t('messages.onlyAdminCanRemove'));
      return;
    }

    const confirmed = await confirm({
      title: t('confirmations.removeAgentTitle', 'Remove Agent'),
      message: t('confirmations.removeAgent', { name: agentName, agency: agencyData.name }) + '\n\n' + t('confirmations.removeAgentDetails'),
      confirmLabel: t('confirmations.removeButton', 'Remove'),
      cancelLabel: t('confirmations.cancelButton', 'Cancel'),
      type: 'danger',
    });

    if (!confirmed) return;

    setRemovingAgentId(agentId);
    try {
      await removeAgentFromAgency(agencyData._id, agentId);

      // Optimistically remove agent from local state for instant UI update
      const removedId = String(agentId);
      setAgents(prevAgents => prevAgents.filter(agent =>
        String(agent.id || agent._id) !== removedId
      ));
      setAgencyData(prev => ({
        ...prev,
        totalAgents: Math.max(0, (prev.totalAgents || 0) - 1),
      }));

      await success(t('messages.agentRemovedTitle', 'Agent Removed'), t('messages.agentRemoved', { name: agentName }));

      // Silently re-fetch full agency data to get updated coupon status and agent list
      fetchAgencyData(true);
    } catch (err: any) {
      await error(t('messages.errorTitle', 'Error'), err.message || t('messages.onlyAdminCanRemove'));
    } finally {
      setRemovingAgentId(null);
    }
  };

  const handleLeaveAgency = async () => {
    const confirmed = await confirm({
      title: t('confirmations.leaveAgencyTitle', 'Leave Agency'),
      message: t('confirmations.leaveAgency', { agency: agencyData.name }) + '\n\n' + t('confirmations.leaveAgencyDetails'),
      confirmLabel: t('confirmations.leaveButton', 'Leave'),
      cancelLabel: t('confirmations.cancelButton', 'Cancel'),
      type: 'warning',
    });

    if (!confirmed) return;

    setIsLeavingAgency(true);
    try {
      const response = await leaveAgency();

      // Update current user in app context — clear agency affiliation
      if (dispatch && currentUser) {
        dispatch({
          type: 'UPDATE_USER',
          payload: {
            agencyId: null,
            agencyName: 'Independent Agent',
            ...(response.subscription ? { subscription: response.subscription } : {}),
          },
        });
      }

      await success(t('messages.leftAgencyTitle', 'Left Agency'), response.message || t('messages.leftAgency', { agency: agencyData.name }));

      // Redirect to home or agencies page
      window.location.href = '/';
    } catch (err: any) {
      await error(t('messages.errorTitle', 'Error'), err.message || t('messages.leftAgency', { agency: agencyData.name }));
    } finally {
      setIsLeavingAgency(false);
    }
  };

  const handleOpenEditModal = () => {
    setEditForm({
      name: agencyData.name,
      description: agencyData.description || '',
      website: agencyData.website || '',
      phone: agencyData.phone || '',
      email: agencyData.email || '',
      address: agencyData.address || '',
      city: agencyData.city || '',
      country: agencyData.country || '',
      zipCode: agencyData.zipCode || '',
      lat: agencyData.lat || 0,
      lng: agencyData.lng || 0,
      facebookUrl: agencyData.facebookUrl || '',
      instagramUrl: agencyData.instagramUrl || '',
      linkedinUrl: agencyData.linkedinUrl || '',
      twitterUrl: agencyData.twitterUrl || '',
      yearsInBusiness: agencyData.yearsInBusiness || 0,
      specialties: agencyData.specialties || [],
      specializations: agencyData.specializations || [],
      serviceAreas: agencyData.serviceAreas || [],
      certifications: agencyData.certifications || [],
      languages: agencyData.languages || [],
      businessHours: {
        monday: agencyData.businessHours?.monday || '',
        tuesday: agencyData.businessHours?.tuesday || '',
        wednesday: agencyData.businessHours?.wednesday || '',
        thursday: agencyData.businessHours?.thursday || '',
        friday: agencyData.businessHours?.friday || '',
        saturday: agencyData.businessHours?.saturday || '',
        sunday: agencyData.businessHours?.sunday || '',
      },
    });
    setIsEditModalOpen(true);
  };

  const handleSaveAgency = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();

    // Frontend validation
    if (!editForm.name || !editForm.name.trim()) {
      await error(t('messages.errorTitle', 'Error'), t('messages.nameRequired', 'Agency name is required'));
      return;
    }

    if (editForm.name.trim().length < 2) {
      await error(t('messages.errorTitle', 'Error'), 'Agency name must be at least 2 characters');
      return;
    }

    if (editForm.description && editForm.description.length > 5000) {
      await error(t('messages.errorTitle', 'Error'), 'Description must be under 5,000 characters');
      return;
    }

    if (editForm.email && editForm.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.email.trim())) {
        await error(t('messages.errorTitle', 'Error'), 'Please enter a valid email address');
        return;
      }
    }

    if (editForm.phone && editForm.phone.trim()) {
      const phoneClean = editForm.phone.replace(/[\s\-().]/g, '');
      if (phoneClean.length < 6 || !/^\+?\d+$/.test(phoneClean)) {
        await error(t('messages.errorTitle', 'Error'), 'Please enter a valid phone number');
        return;
      }
    }

    // Validate URL fields
    const urlFields = [
      { name: t('fields.website', 'Website'), value: editForm.website },
      { name: 'Facebook', value: editForm.facebookUrl },
      { name: 'Instagram', value: editForm.instagramUrl },
      { name: 'LinkedIn', value: editForm.linkedinUrl },
      { name: 'Twitter', value: editForm.twitterUrl },
    ];
    for (const { name: fieldName, value } of urlFields) {
      if (value && value.trim()) {
        try {
          new URL(value);
        } catch {
          await error(t('messages.errorTitle', 'Error'), t('messages.invalidUrl', `Invalid URL for {{field}}. Please include https://`, { field: fieldName }));
          return;
        }
      }
    }

    // Sanitize: filter empty strings from arrays, trim text fields
    const sanitizedForm = {
      ...editForm,
      name: editForm.name.trim(),
      description: (editForm.description || '').trim(),
      website: (editForm.website || '').trim(),
      phone: (editForm.phone || '').trim(),
      email: (editForm.email || '').trim(),
      address: (editForm.address || '').trim(),
      city: (editForm.city || '').trim(),
      country: (editForm.country || '').trim(),
      specialties: editForm.specialties.filter(s => s.trim()),
      specializations: editForm.specializations.filter(s => s.trim()),
      serviceAreas: editForm.serviceAreas.filter(s => s.trim()),
      certifications: editForm.certifications.filter(s => s.trim()),
      languages: editForm.languages.filter(s => s.trim()),
    };

    // Optimistic update: apply changes immediately, close modal, save in background
    const previousData = { ...agencyData };
    setAgencyData(prev => ({ ...prev, ...sanitizedForm }));
    setIsEditModalOpen(false);
    setIsSavingAgency(true);

    try {
      const token = tokenService.getAccessToken();

      await _ensureCsrf();
      const response = await fetch(`${API_URL}/agencies/${agencyData._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ..._csrfHeaders(),
        },
        body: JSON.stringify(sanitizedForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update agency');
      }

      const data = await response.json();
      // Apply server response to ensure data consistency
      setAgencyData(prev => ({ ...prev, ...data.agency }));
      await success(t('messages.agencyUpdatedTitle', 'Agency Updated'), t('messages.agencyUpdated'));
    } catch (err) {
      // Revert optimistic update on failure
      setAgencyData(previousData);
      await error(t('messages.errorTitle', 'Error'), err instanceof Error ? err.message : t('messages.updateFailed', 'Failed to update agency'));
    } finally {
      setIsSavingAgency(false);
    }
  };

  // Achievement handlers
  const handleAddAchievement = async (achievement: Omit<Achievement, 'id' | 'createdAt' | 'isVerified'>) => {
    try {
      const newAchievement = await addAgencyAchievement(agencyData._id || agencyData.id || '', {
        type: achievement.type,
        title: achievement.title,
        description: achievement.description,
        dateReceived: achievement.dateReceived,
        expiryDate: achievement.expiryDate,
        issuingOrganization: achievement.issuingOrganization,
        documentUrl: achievement.documentUrl,
      });
      setAgencyAchievements(prev => [...prev, newAchievement]);
      await success(t('achievements.addedTitle', 'Achievement Added'), t('achievements.addedMessage', 'The achievement has been added successfully'));
    } catch (err) {
      await error(t('messages.errorTitle', 'Error'), err instanceof Error ? err.message : t('achievements.addFailed', 'Failed to add achievement'));
      throw err;
    }
  };

  const handleEditAchievement = async (id: string, achievement: Partial<Achievement>) => {
    try {
      const updated = await updateAgencyAchievement(agencyData._id || agencyData.id || '', id, {
        type: achievement.type,
        title: achievement.title,
        description: achievement.description,
        dateReceived: achievement.dateReceived,
        expiryDate: achievement.expiryDate,
        issuingOrganization: achievement.issuingOrganization,
        documentUrl: achievement.documentUrl,
      });
      setAgencyAchievements(prev => prev.map(a => a.id === id ? updated : a));
      await success(t('achievements.updatedTitle', 'Achievement Updated'), t('achievements.updatedMessage', 'The achievement has been updated successfully'));
    } catch (err) {
      await error(t('messages.errorTitle', 'Error'), err instanceof Error ? err.message : t('achievements.updateFailed', 'Failed to update achievement'));
      throw err;
    }
  };

  const handleDeleteAchievement = async (id: string) => {
    try {
      await deleteAgencyAchievement(agencyData._id || agencyData.id || '', id);
      setAgencyAchievements(prev => prev.filter(a => a.id !== id));
      await success(t('achievements.deletedTitle', 'Achievement Deleted'), t('achievements.deletedMessage', 'The achievement has been deleted'));
    } catch (err) {
      await error(t('messages.errorTitle', 'Error'), err instanceof Error ? err.message : t('achievements.deleteFailed', 'Failed to delete achievement'));
      throw err;
    }
  };

  const uploadLogoFile = async (file: File) => {
    if (!isOwner) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(t('messages.selectImageFile'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('messages.imageSizeLimit'));
      return;
    }

    // Optimistic preview: show the image immediately while uploading
    const previousLogo = agencyData.logo;
    const previewUrl = URL.createObjectURL(file);
    setAgencyData(prev => ({ ...prev, logo: previewUrl }));
    setIsUploadingLogo(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('logo', file);

      await _ensureCsrf();
      const response = await fetch(`${API_URL}/agencies/${agencyData._id}/upload-logo`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${tokenService.getAccessToken()}`,
          ..._csrfHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || t('messages.uploadFailed', 'Failed to upload logo'));
      }

      const data = await response.json();
      // Apply server URL (Cloudinary optimized) to replace the local preview
      setAgencyData(prev => ({
        ...prev,
        logo: data.logo || data.agency?.logo || prev.logo,
        logoPublicId: data.agency?.logoPublicId || prev.logoPublicId,
      }));
      await success(t('messages.logoUpdatedTitle', 'Logo Updated'), t('messages.logoUpdated'));
    } catch (err) {
      // Revert optimistic preview on failure
      setAgencyData(prev => ({ ...prev, logo: previousLogo }));
      setUploadError(err instanceof Error ? err.message : t('messages.uploadFailed', 'Upload failed'));
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsUploadingLogo(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadLogoFile(file);
  };

  const uploadCoverFile = async (file: File) => {
    if (!isAdmin) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(t('messages.selectImageFile'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('messages.imageSizeLimit'));
      return;
    }

    // Optimistic preview: show the image immediately while uploading
    const previewUrl = URL.createObjectURL(file);
    setAgencyData(prev => ({ ...prev, coverImage: previewUrl }));
    setIsUploadingCover(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('cover', file);

      await _ensureCsrf();
      const response = await fetch(`${API_URL}/agencies/${agencyData._id}/upload-cover`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${tokenService.getAccessToken()}`,
          ..._csrfHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to upload cover image');
      }

      const data = await response.json();

      // Reset the file input so the same file can be re-selected if needed
      const fileInput = document.getElementById('cover-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Apply server URL (Cloudinary optimized) to replace the local preview
      setAgencyData(prev => ({
        ...prev,
        coverImage: data.coverImage || data.agency?.coverImage || prev.coverImage,
        coverImagePublicId: data.agency?.coverImagePublicId || prev.coverImagePublicId,
      }));
      await success(t('messages.coverUpdatedTitle', 'Cover Updated'), t('messages.coverUpdated', 'Banner image updated successfully'));
    } catch (err) {
      // Revert optimistic preview on failure
      setAgencyData(prev => ({ ...prev, coverImage: agencyData.coverImage }));
      const msg = err instanceof Error ? err.message : t('messages.uploadFailed', 'Upload failed');
      setUploadError(msg);
      await error('Upload Failed', msg);
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsUploadingCover(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadCoverFile(file);
  };

  // Drag-and-drop handlers for cover image
  const handleCoverDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    coverDragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setCoverDragActive(true);
    }
  };

  const handleCoverDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    coverDragCounter.current--;
    if (coverDragCounter.current === 0) {
      setCoverDragActive(false);
    }
  };

  const handleCoverDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCoverDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCoverDragActive(false);
    coverDragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadCoverFile(file);
  };

  // Drag-and-drop handlers for logo
  const handleLogoDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logoDragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setLogoDragActive(true);
    }
  };

  const handleLogoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    logoDragCounter.current--;
    if (logoDragCounter.current === 0) {
      setLogoDragActive(false);
    }
  };

  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleLogoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLogoDragActive(false);
    logoDragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadLogoFile(file);
  };

  const handleGradientSelect = async (gradientId: string) => {
    if (!isAdmin) return;

    const gradient = GRADIENT_PRESETS.find(g => g.id === gradientId);
    if (!gradient) return;

    // Optimistic update: apply gradient immediately
    const previousData = { coverGradient: (agencyData as any).coverGradient, coverImage: agencyData.coverImage };
    setAgencyData(prev => ({ ...prev, coverGradient: gradient.gradient, coverImage: '' } as any));
    setShowGradientPicker(false);

    try {
      await _ensureCsrf();
      const response = await fetch(`${API_URL}/agencies/${agencyData._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenService.getAccessToken()}`,
          ..._csrfHeaders(),
        },
        body: JSON.stringify({
          coverGradient: gradient.gradient,
          coverImage: '', // Clear cover image when selecting gradient
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || t('messages.updateFailed', 'Failed to update gradient'));
      }

      const data = await response.json();
      setAgencyData(prev => ({ ...prev, ...data.agency }));
      await success(t('messages.gradientUpdatedTitle', 'Gradient Updated'), t('messages.gradientUpdated'));
    } catch (err) {
      // Revert on failure
      setAgencyData(prev => ({ ...prev, ...previousData } as any));
      await error(t('messages.errorTitle', 'Error'), err instanceof Error ? err.message : t('messages.updateFailed', 'Failed to update gradient'));
    }
  };

  // --- Image Repositioning Handlers ---
  // Use refs to always have the latest position values (avoids stale closures)
  const coverPosRef = useRef(coverPos);
  coverPosRef.current = coverPos;
  const logoPosRef = useRef(logoPos);
  logoPosRef.current = logoPos;

  const saveImagePosition = async (type: 'cover' | 'logo', pos: { x: number; y: number }) => {
    // Optimistic: position is already visually applied via coverPos/logoPos state
    // Also update agencyData so it persists across re-renders
    const posKey = type === 'cover' ? 'coverPosition' : 'logoPosition';
    const previousPos = agencyData[posKey as keyof typeof agencyData] as { x: number; y: number } | undefined;
    setAgencyData(prev => ({ ...prev, [posKey]: pos }));

    try {
      const body = type === 'cover' ? { coverPosition: pos } : { logoPosition: pos };
      await _ensureCsrf();
      const response = await fetch(`${API_URL}/agencies/${agencyData._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenService.getAccessToken()}`,
          ..._csrfHeaders(),
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Failed to save position');
    } catch (err) {
      // Revert position on failure
      setAgencyData(prev => ({ ...prev, [posKey]: previousPos }));
      if (type === 'cover') setCoverPos({ x: previousPos?.x ?? 50, y: previousPos?.y ?? 50 });
      else setLogoPos({ x: previousPos?.x ?? 50, y: previousPos?.y ?? 50 });
      await error('Error', 'Failed to save image position');
    }
  };

  const handleRepositionMouseDown = (e: React.MouseEvent | React.TouchEvent, type: 'cover' | 'logo') => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    // Use refs to get latest position (avoids stale closure from React batching)
    const pos = type === 'cover' ? coverPosRef.current : logoPosRef.current;
    dragStartRef.current = { x: clientX, y: clientY, posX: pos.x, posY: pos.y };

    const containerRef = type === 'cover' ? coverRef : logoRef;

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;
      ev.preventDefault();
      const cx = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
      const cy = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
      const rect = containerRef.current.getBoundingClientRect();
      // Invert: dragging right moves object-position left (reveals right side)
      const dx = ((cx - dragStartRef.current.x) / rect.width) * -100;
      const dy = ((cy - dragStartRef.current.y) / rect.height) * -100;
      const newX = Math.max(0, Math.min(100, dragStartRef.current.posX + dx));
      const newY = Math.max(0, Math.min(100, dragStartRef.current.posY + dy));
      if (type === 'cover') setCoverPos({ x: newX, y: newY });
      else setLogoPos({ x: newX, y: newY });
    };

    const handleUp = () => {
      dragStartRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);
  };

  const handleFinishRepositioning = (type: 'cover' | 'logo') => {
    // Use refs to get the latest position (avoids stale closure issues)
    const pos = type === 'cover' ? { ...coverPosRef.current } : { ...logoPosRef.current };
    // Close reposition mode immediately
    if (type === 'cover') setIsRepositioningCover(false);
    else setIsRepositioningLogo(false);
    // Save in background — no await so UI doesn't block
    saveImagePosition(type, pos).then(() => {
      success('Position Saved', `${type === 'cover' ? 'Cover' : 'Logo'} position updated successfully`);
    });
  };

  const handleCancelRepositioning = (type: 'cover' | 'logo') => {
    if (type === 'cover') {
      setCoverPos({ x: agencyData.coverPosition?.x ?? 50, y: agencyData.coverPosition?.y ?? 50 });
      setIsRepositioningCover(false);
    } else {
      setLogoPos({ x: agencyData.logoPosition?.x ?? 50, y: agencyData.logoPosition?.y ?? 50 });
      setIsRepositioningLogo(false);
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return { emoji: '🏆', color: 'from-amber-400 to-amber-600', text: '#1' };
    if (index === 1) return { emoji: '🥈', color: 'from-slate-300 to-slate-500', text: '#2' };
    if (index === 2) return { emoji: '🥉', color: 'from-orange-400 to-orange-600', text: '#3' };
    return { emoji: '', color: 'from-primary to-blue-600', text: `#${index + 1}` };
  };

  const handleSubscriptionSuccess = () => {
    // Silently refresh agency data to get updated featured status
    fetchAgencyData(true);
    // Force re-render of subscription card
    setSubscriptionKey((prev) => prev + 1);
  };

  // Scroll to top when property view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [propertyView]);

  // Sync positions when agencyData changes (e.g., after re-fetch) — skip during active repositioning
  useEffect(() => {
    if (!isRepositioningCover) setCoverPos({ x: agencyData.coverPosition?.x ?? 50, y: agencyData.coverPosition?.y ?? 50 });
  }, [agencyData.coverPosition?.x, agencyData.coverPosition?.y, isRepositioningCover]);

  useEffect(() => {
    if (!isRepositioningLogo) setLogoPos({ x: agencyData.logoPosition?.x ?? 50, y: agencyData.logoPosition?.y ?? 50 });
  }, [agencyData.logoPosition?.x, agencyData.logoPosition?.y, isRepositioningLogo]);

  // Close share dropdown on outside click
  useEffect(() => {
    if (!showShareDropdown) return;
    const handler = () => setShowShareDropdown(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showShareDropdown]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white overflow-x-hidden">
      {/* SEO Meta Tags with AggregateRating schema */}
      <SEO
        title={`${agencyData.name} - Real Estate Agency${agencyData.city ? ` in ${agencyData.city}` : ''}${agencyData.country ? `, ${agencyData.country}` : ''}`}
        description={agencyData.description || `${agencyData.name} is a trusted real estate agency in ${agencyData.city || 'the Balkans'}. Browse ${agencyData.totalProperties || 0} property listings and connect with ${agencyData.totalAgents || 0} professional agents.`}
        canonical={`${typeof window !== 'undefined' ? window.location.origin : ''}/agencies/${agency.slug}`}
        image={agencyData.logo || agencyData.coverImage}
        type="website"
        agency={{
          name: agencyData.name,
          logo: agencyData.logo,
          description: agencyData.description,
          address: agencyData.address,
          city: agencyData.city,
          country: agencyData.country,
          phone: agencyData.phone,
          email: agencyData.email,
          rating: (agencyData as any).rating,
          totalReviews: (agencyData as any).totalReviews,
          totalProperties: agencyData.totalProperties,
          totalAgents: agencyData.totalAgents,
          website: agencyData.website,
          yearsFounded: agencyData.yearsInBusiness,
        }}
      />

      {/* Hero Banner - Professional Design */}
      <div
        ref={coverRef}
        className={`relative flex-shrink-0 ${isRepositioningCover || isRepositioningLogo ? 'select-none' : ''}`}
        style={(isRepositioningCover || isRepositioningLogo) ? { touchAction: 'none' } : undefined}
        onDragEnter={isAdmin ? handleCoverDragEnter : undefined}
        onDragLeave={isAdmin ? handleCoverDragLeave : undefined}
        onDragOver={isAdmin ? handleCoverDragOver : undefined}
        onDrop={isAdmin ? handleCoverDrop : undefined}
      >
        {/* Drag-and-drop overlay for cover image */}
        {coverDragActive && isAdmin && (
          <div className="absolute inset-0 z-[60] bg-primary/30 backdrop-blur-sm border-4 border-dashed border-white/70 flex items-center justify-center pointer-events-none">
            <div className="bg-white/95 backdrop-blur-xl px-8 py-5 rounded-2xl shadow-2xl text-center">
              <svg className="w-10 h-10 mx-auto mb-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-semibold text-slate-800">{t('banner.dropCoverImage', 'Drop to upload cover image')}</p>
              <p className="text-xs text-slate-500 mt-1">{t('banner.maxSize', 'Max 5MB, images only')}</p>
            </div>
          </div>
        )}
        {/* Upload progress overlay for cover */}
        {isUploadingCover && (
          <div className="absolute bottom-0 left-0 right-0 z-[55] pointer-events-none">
            <div className="h-1 bg-white/20">
              <div className="h-full bg-primary animate-pulse rounded-full" style={{ width: '70%' }} />
            </div>
          </div>
        )}
        {/* Background Layer - overflow-hidden wrapper keeps cover image clipped */}
        <div className="absolute inset-0 overflow-hidden">
        {agencyData.coverImage ? (
          <>
            <img
              src={agencyData.coverImage}
              alt={`${agencyData.name} - Real Estate Agency${agencyData.city ? ` in ${agencyData.city}` : ''}${agencyData.country ? `, ${agencyData.country}` : ''}`}
              className={`absolute inset-0 w-full h-full object-cover ${isRepositioningCover ? 'cursor-grab active:cursor-grabbing z-30 select-none' : ''}`}
              style={{
                objectPosition: `${coverPos.x}% ${coverPos.y}%`,
                ...(isRepositioningCover ? { touchAction: 'none' } : {}),
              }}
              draggable={false}
              onMouseDown={isRepositioningCover ? (e) => handleRepositionMouseDown(e, 'cover') : undefined}
              onTouchStart={isRepositioningCover ? (e) => handleRepositionMouseDown(e, 'cover') : undefined}
            />
            {!isRepositioningCover && (
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/90" />
            )}
            {/* Repositioning overlay */}
            {isRepositioningCover && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-40 pointer-events-none">
                <div className="bg-black/70 text-white px-6 py-3 rounded-xl text-sm font-medium backdrop-blur-sm pointer-events-none select-none">
                  Drag to reposition cover image
                </div>
              </div>
            )}
            {isRepositioningCover && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2">
                <button
                  onClick={() => handleFinishRepositioning('cover')}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl shadow-lg hover:bg-primary/90 transition-colors"
                >
                  Save Position
                </button>
                <button
                  onClick={() => handleCancelRepositioning('cover')}
                  className="px-4 py-2 bg-white/90 text-slate-700 text-sm font-medium rounded-xl shadow-lg hover:bg-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: resolveGradientCss((agencyData as any).coverGradient) }}
          />
        )}

        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        </div>

          {/* Top Navigation Bar */}
          <div className={`absolute top-0 left-0 right-0 z-20 px-4 md:px-6 py-4 ${isRepositioningCover ? 'pointer-events-none opacity-30' : ''}`}>
            <div className="flex items-start justify-between">
              {/* Left Side - Back Button and Breadcrumbs stacked */}
              <div className="flex flex-col gap-2">
                {/* Back Button */}
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 text-white/90 font-medium px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 w-fit"
                  aria-label={t('navigation.backToAgencies')}
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  {t('navigation.back')}
                </button>

              {/* Breadcrumbs - Below back button, hidden on mobile */}
              <div className="ml-1 hidden sm:block">
                <Breadcrumbs
                  items={generateAgencyBreadcrumbs({
                    slug: agency.slug || '',
                    name: agencyData.name,
                    country: agencyData.country,
                  })}
                  className="text-white/70 text-sm"
                />
              </div>
            </div>

            {/* Right Side - Global Nav */}
            <div className="flex items-center gap-2">
              {/* Single Customize Button for owners/admins */}
              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={() => { setShowCoverControls(!showCoverControls); if (showGradientPicker) setShowGradientPicker(false); }}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 backdrop-blur-md text-white text-sm font-medium rounded-xl border border-white/20 transition-all duration-300 ${
                      showCoverControls ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <PencilIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('banner.customize', 'Customize')}</span>
                  </button>

                  {/* Expanded Cover Controls Dropdown */}
                  {showCoverControls && (
                    <div className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden min-w-[200px]">
                      {/* Gradient Option */}
                      <button
                        onClick={() => { setShowGradientPicker(!showGradientPicker); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        {t('banner.gradients')}
                      </button>

                      {/* Upload Cover Image Option */}
                      <input
                        type="file"
                        id="cover-upload"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        disabled={isUploadingCover}
                        className="hidden"
                      />
                      <label
                        htmlFor="cover-upload"
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer ${
                          isUploadingCover ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isUploadingCover ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-primary"></div>
                            {t('banner.uploading')}
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {t('banner.uploadImage')}
                          </>
                        )}
                      </label>

                      {/* Change Logo Option */}
                      <input
                        type="file"
                        id="logo-upload-menu"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                      <label
                        htmlFor="logo-upload-menu"
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer border-t border-slate-100 ${
                          isUploadingLogo ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isUploadingLogo ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-primary"></div>
                            {t('banner.uploading')}
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {t('banner.changeLogo')}
                          </>
                        )}
                      </label>

                      {/* Reposition Cover Image */}
                      {agencyData.coverImage && (
                        <button
                          onClick={() => { setIsRepositioningCover(true); setShowCoverControls(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                        >
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                          Reposition Cover
                        </button>
                      )}

                      {/* Reposition Logo */}
                      {agencyData.logo && (
                        <button
                          onClick={() => { setIsRepositioningLogo(true); setShowCoverControls(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                        >
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                          Reposition Logo
                        </button>
                      )}

                      {/* Gradient Picker - Nested */}
                      {showGradientPicker && (
                        <div className="border-t border-slate-200 p-4 max-h-72 overflow-y-auto">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-900">{t('banner.chooseGradient')}</h3>
                            <button
                              onClick={() => setShowGradientPicker(false)}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {GRADIENT_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                onClick={() => handleGradientSelect(preset.id)}
                                className="group relative h-16 rounded-xl overflow-hidden border-2 border-slate-200 hover:border-primary transition-all duration-300 hover:scale-[1.02]"
                              >
                                <div className="absolute inset-0" style={{ backgroundImage: preset.css }} />
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-white font-medium text-xs drop-shadow-lg">
                                    {preset.name}
                                  </span>
                                </div>
                                {((agencyData as any).coverGradient === preset.gradient || (agencyData as any).coverGradient === preset.id) && (
                                  <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
                                    <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-slate-500 mt-2 text-center">
                            {t('banner.customImageHint')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Global Nav Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={handleSubscribeClick}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-primary/80 hover:bg-primary text-white text-sm font-semibold rounded-xl border border-white/20 transition-all duration-300"
                >
                  {t('nav:subscribe')}
                </button>
                <button
                  onClick={handleNewListingClick}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 bg-secondary/80 hover:bg-secondary text-white text-sm font-semibold rounded-xl border border-white/20 transition-all duration-300"
                >
                  + {t('nav:newListing')}
                </button>
                <NotificationCenter />
                {isAuthenticated && currentUser ? (
                  <button
                    onClick={handleAccountClick}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 backdrop-blur-md text-white text-sm font-medium rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
                    aria-label={t('nav:myAccount')}
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                      <UserAvatar src={currentUser.avatarUrl} gender={currentUser.gender} seed={currentUser.id || currentUser.name} avatarOptions={currentUser.avatarOptions} />
                    </div>
                    <span className="hidden lg:inline">{t('nav:myAccount')}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleAccountClick}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 backdrop-blur-md text-white text-sm font-medium rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
                    aria-label={t('nav:loginRegister')}
                  >
                    <User className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden lg:inline">{t('nav:loginRegister')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Agency Identity - Centered Content (relative so hero grows with content) */}
        <div className={`relative z-10 flex flex-col items-center justify-center min-h-[28rem] md:min-h-[32rem] px-4 pt-24 pb-20 ${isRepositioningCover ? 'pointer-events-none opacity-30' : ''}`}>
          {/* Logo Container */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div
              ref={logoRef}
              className={`relative w-28 h-28 md:w-32 md:h-32 rounded-2xl border-2 shadow-2xl overflow-hidden bg-white/10 backdrop-blur-md flex-shrink-0 ${
                logoDragActive ? 'border-primary border-dashed' : 'border-white/30'
              }`}
              onDragEnter={isOwner ? handleLogoDragEnter : undefined}
              onDragLeave={isOwner ? handleLogoDragLeave : undefined}
              onDragOver={isOwner ? handleLogoDragOver : undefined}
              onDrop={isOwner ? handleLogoDrop : undefined}
            >
              {/* Logo drag-and-drop overlay */}
              {logoDragActive && isOwner && (
                <div className="absolute inset-0 z-30 bg-primary/40 backdrop-blur-sm flex items-center justify-center pointer-events-none rounded-2xl">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {/* Logo upload spinner */}
              {isUploadingLogo && (
                <div className="absolute inset-0 z-30 bg-black/30 backdrop-blur-[2px] flex items-center justify-center pointer-events-none rounded-2xl">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white" />
                </div>
              )}
              {agencyData.logo ? (
                <>
                  <img
                    src={agencyData.logo}
                    alt={`${agencyData.name} logo - Real Estate Agency`}
                    className={`w-full h-full object-cover ${isRepositioningLogo ? 'cursor-grab active:cursor-grabbing z-20 select-none' : ''}`}
                    style={{
                      objectPosition: `${logoPos.x}% ${logoPos.y}%`,
                      ...(isRepositioningLogo ? { touchAction: 'none' } : {}),
                    }}
                    draggable={false}
                    onMouseDown={isRepositioningLogo ? (e) => handleRepositionMouseDown(e, 'logo') : undefined}
                    onTouchStart={isRepositioningLogo ? (e) => handleRepositionMouseDown(e, 'logo') : undefined}
                  />
                  {isRepositioningLogo && (
                    <div className="absolute inset-0 border-2 border-dashed border-white/60 rounded-2xl pointer-events-none z-10" />
                  )}
                  {isRepositioningLogo && (
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-50 flex gap-1.5">
                      <button
                        onClick={() => handleFinishRepositioning('logo')}
                        className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg shadow-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => handleCancelRepositioning('logo')}
                        className="px-3 py-1.5 bg-white/90 text-slate-700 text-xs font-medium rounded-lg shadow-lg hover:bg-white transition-colors whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {isOwner ? (
                    <label htmlFor="logo-upload-drop" className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                      <svg className="w-8 h-8 text-white/70 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-[10px] text-white/60 font-medium">{t('banner.addLogo', 'Add Logo')}</span>
                      <input id="logo-upload-drop" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  ) : (
                    <BuildingOfficeIcon className="w-14 h-14 text-white" />
                  )}
                </div>
              )}
            </div>

            {/* Featured Badge */}
            {agencyData.isFeatured && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2.5 py-1 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-1">
                <StarIcon className="w-3 h-3 fill-current" />
                {t('common.featured')}
              </div>
            )}

          </div>

          {/* Agency Name */}
          <h1 className="mt-8 text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center tracking-tight">
            {agencyData.name}
          </h1>

          {/* Location Badge */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <MapPinIcon className="w-4 h-4 text-white/80" />
            <span className="text-white/90 font-medium text-sm">{agencyData.city}, {agencyData.country}</span>
          </div>

          {/* Share & Favourite Actions */}
          <div className="mt-4 flex items-center gap-3">
            {/* Favourite Button */}
            <button
              onClick={handleToggleFavourite}
              disabled={isTogglingFavourite}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border transition-all duration-300 text-sm font-medium ${
                isFavourited
                  ? 'bg-red-500/90 border-red-400/50 text-white'
                  : 'bg-white/10 border-white/20 text-white/90 hover:bg-white/20'
              }`}
              aria-label={isFavourited ? t('common:removeFromFavorites') : t('common:addToFavorites')}
              aria-pressed={isFavourited}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-4 h-4 ${isFavourited ? 'fill-current' : ''}`}
                fill={isFavourited ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={isFavourited ? 0 : 1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {isFavourited ? t('common:saved') : t('common:save')}
            </button>

            {/* Share Button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof navigator !== 'undefined' && navigator.share) {
                    navigator.share({
                      title: agencyData.name,
                      text: agencyData.description || `${agencyData.name} - Real Estate Agency`,
                      url: window.location.href,
                    }).catch(() => {});
                  } else {
                    setShowShareDropdown(!showShareDropdown);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md text-white/90 text-sm font-medium rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300"
                aria-label={t('common:share')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.863a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186z" />
                </svg>
                {t('common:share')}
              </button>
              {showShareDropdown && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50">
                  <SocialShare
                    url={typeof window !== 'undefined' ? window.location.href : ''}
                    title={`${agencyData.name} - Real Estate Agency`}
                    description={agencyData.description || `${agencyData.totalAgents} agents, ${agencyProperties.length} listings`}
                    variant="icons"
                    platforms={['facebook', 'twitter', 'whatsapp', 'linkedin', 'email', 'copy']}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="mt-6 flex items-center gap-6 md:gap-8">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-white">{agencyProperties.length}</p>
              <p className="text-xs md:text-sm text-white/60 font-medium uppercase tracking-wider">{t('agencyDetails:stats.totalListings')}</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-white">{agencyData.totalAgents}</p>
              <p className="text-xs md:text-sm text-white/60 font-medium uppercase tracking-wider">{t('agencyDetails:stats.totalAgents')}</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <StarIcon className="w-5 h-5 text-amber-400 fill-current" />
                <p className="text-2xl md:text-3xl font-bold text-white">{agencyData.rating?.toFixed(1) || 'N/A'}</p>
              </div>
              <p className="text-xs md:text-sm text-white/60 font-medium uppercase tracking-wider">{t('agencyDetails:stats.rating')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 pb-16">
        {/* Upload Error Message */}
        {uploadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">{uploadError}</p>
          </div>
        )}

        {/* Sales Performance Card - Prominent Position */}
        {soldProperties.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 md:p-8 mb-8 border border-slate-100 overflow-hidden relative">
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{t('salesPerformance.title')}</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
                  <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">{t('salesPerformance.salesLast12Months')}</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900">{salesLast12Months}</p>
                </div>
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
                  <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">{t('salesPerformance.totalSales')}</p>
                  <p className="text-2xl md:text-3xl font-bold text-green-600">{totalSales}</p>
                </div>
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
                  <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">{t('salesPerformance.priceRange')}</p>
                  <p className="text-sm md:text-base font-bold text-slate-700">
                    {minPrice > 0 && maxPrice > 0 ? (
                      <>
                        {formatPrice(minPrice, agencyData.country || 'Serbia')} - {formatPrice(maxPrice, agencyData.country || 'Serbia')}
                      </>
                    ) : (
                      t('stats.notAvailable')
                    )}
                  </p>
                </div>
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
                  <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">{t('salesPerformance.averagePrice')}</p>
                  <p className="text-lg md:text-xl font-bold text-primary">
                    {averagePrice > 0 ? formatPrice(averagePrice, agencyData.country || 'Serbia') : t('stats.notAvailable')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* About Section - Modern Engaging Layout */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden mb-8 border border-slate-100">
          {/* Header - Liquid Glass */}
          <div
            className="relative px-6 md:px-8 py-6 border-b border-slate-100"
            style={{
              background: 'rgba(248, 250, 252, 0.8)',
              backdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <BuildingOfficeIcon className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">{t('agencyDetails:about.title', { agencyName: agencyData.name })}</h2>
                {agencyData.yearsInBusiness && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full text-primary text-xs font-medium">
                      <SparklesIcon className="w-3.5 h-3.5" />
                      {t('agencyDetails:about.yearsOfExcellence', '{{years}}+ Years of Excellence', { years: agencyData.yearsInBusiness })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {/* Description with Rich Formatting */}
            {agencyData.description && (() => {
              const paragraphs = agencyData.description
                .split(/\n\s*\n|\n/)
                .map((p: string) => p.trim())
                .filter((p: string) => p.length > 0);

              return (
                <div className="relative mb-8">
                  {/* Decorative accent */}
                  <div className="absolute -left-2 top-0 w-1 h-full rounded-full bg-gradient-to-b from-primary via-primary/40 to-transparent" />

                  <div className="pl-5 space-y-4">
                    {/* Opening quote icon */}
                    <svg className="w-8 h-8 text-primary/20 -mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609L9.978 5.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H0z" />
                    </svg>

                    {paragraphs.map((paragraph: string, idx: number) => (
                      <p
                        key={idx}
                        className={`leading-relaxed ${
                          idx === 0
                            ? 'text-slate-700 text-base font-medium first-letter:text-3xl first-letter:font-bold first-letter:text-primary first-letter:float-left first-letter:mr-1.5 first-letter:mt-0.5 first-letter:leading-none'
                            : 'text-slate-600 text-sm'
                        }`}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Achievements Display - Public View */}
            {agencyAchievements.length > 0 && (
              <div className="mb-8">
                <AchievementsSection
                  achievements={agencyAchievements}
                  isOwner={false}
                  entityType="agency"
                />
              </div>
            )}

            {/* Quick Stats Row - Liquid Glass */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <div
                className="text-center p-4 rounded-xl border border-slate-200/60"
                style={{ background: 'rgba(59, 130, 246, 0.05)' }}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/15 flex items-center justify-center">
                  <HomeIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{agencyProperties?.length || 0}</div>
                <div className="text-xs text-slate-500 font-medium">{t('agencyDetails:stats.totalListings')}</div>
              </div>
              <div
                className="text-center p-4 rounded-xl border border-slate-200/60"
                style={{ background: 'rgba(16, 185, 129, 0.05)' }}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <UserGroupIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{agents?.length || 0}</div>
                <div className="text-xs text-slate-500 font-medium">{t('agencyDetails:stats.totalAgents')}</div>
              </div>
              <div
                className="text-center p-4 rounded-xl border border-slate-200/60"
                style={{ background: 'rgba(139, 92, 246, 0.05)' }}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-violet-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{agencyData.yearsInBusiness || 1}+</div>
                <div className="text-xs text-slate-500 font-medium">Years</div>
              </div>
              <div
                className="text-center p-4 rounded-xl border border-slate-200/60"
                style={{ background: 'rgba(245, 158, 11, 0.05)' }}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <StarIcon className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{agencyData.rating?.toFixed(1) || '5.0'}</div>
                <div className="text-xs text-slate-500 font-medium">{t('agencyDetails:stats.rating')}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column - Contact */}
              <div className="space-y-5">
                {/* Contact Card */}
                <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200/60">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                      <PhoneIcon className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{t('agencyDetails:about.getInTouch', 'Get in Touch')}</h3>
                  </div>
                  <div className="space-y-3">
                    <a href={`tel:${agencyData.phone}`} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:scale-110 flex items-center justify-center transition-all duration-300">
                        <PhoneIcon className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium">{t('agencyDetails:labels.call', 'Phone')}</div>
                        <span className="font-semibold text-slate-700 group-hover:text-primary transition-colors">{agencyData.phone}</span>
                      </div>
                    </a>
                    <a href={`mailto:${agencyData.email}`} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:scale-110 flex items-center justify-center transition-all duration-300">
                        <EnvelopeIcon className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium">{t('agencyDetails:labels.email')}</div>
                        <span className="font-semibold text-slate-700 group-hover:text-primary transition-colors">{agencyData.email}</span>
                      </div>
                    </a>
                    {agencyData.address && (
                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPinIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 font-medium">{t('agencyDetails:about.address', 'Address')}</div>
                          <span className="font-medium text-slate-700 text-sm leading-snug">{agencyData.address}</span>
                        </div>
                      </div>
                    )}

                    {/* Website */}
                    {agencyData.website && (
                      <a href={agencyData.website.startsWith('http') ? agencyData.website : `https://${agencyData.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:scale-110 flex items-center justify-center transition-all duration-300">
                          <GlobeAltIcon className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-slate-400 font-medium">{t('agencyDetails:labels.website')}</div>
                          <span className="font-semibold text-slate-700 group-hover:text-primary transition-colors text-sm truncate block">{agencyData.website}</span>
                        </div>
                      </a>
                    )}
                  </div>
                </div>

                {/* Social Media Links */}
                {(agencyData.facebookUrl || agencyData.instagramUrl || agencyData.linkedinUrl || agencyData.twitterUrl) && (
                  <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200/60">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{t('agencyDetails:about.followUs', 'Follow Us')}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {agencyData.facebookUrl && (
                        <a href={agencyData.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 bg-white rounded-lg border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all group">
                          <div className="w-9 h-9 rounded-lg bg-[#1877F2]/10 group-hover:bg-[#1877F2] flex items-center justify-center transition-all duration-300">
                            <svg className="w-5 h-5 text-[#1877F2] group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-slate-700 group-hover:text-[#1877F2] transition-colors">Facebook</span>
                        </a>
                      )}
                      {agencyData.instagramUrl && (
                        <a href={agencyData.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 bg-white rounded-lg border border-slate-100 hover:border-pink-300 hover:shadow-md transition-all group">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#F58529]/10 via-[#DD2A7B]/10 to-[#8134AF]/10 group-hover:bg-gradient-to-br group-hover:from-[#F58529] group-hover:via-[#DD2A7B] group-hover:to-[#8134AF] flex items-center justify-center transition-all duration-300">
                            <svg className="w-5 h-5 text-[#DD2A7B] group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-slate-700 group-hover:text-[#DD2A7B] transition-colors">Instagram</span>
                        </a>
                      )}
                      {agencyData.linkedinUrl && (
                        <a href={agencyData.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 bg-white rounded-lg border border-slate-100 hover:border-blue-400 hover:shadow-md transition-all group">
                          <div className="w-9 h-9 rounded-lg bg-[#0A66C2]/10 group-hover:bg-[#0A66C2] flex items-center justify-center transition-all duration-300">
                            <svg className="w-5 h-5 text-[#0A66C2] group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-slate-700 group-hover:text-[#0A66C2] transition-colors">LinkedIn</span>
                        </a>
                      )}
                      {agencyData.twitterUrl && (
                        <a href={agencyData.twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 bg-white rounded-lg border border-slate-100 hover:border-slate-400 hover:shadow-md transition-all group">
                          <div className="w-9 h-9 rounded-lg bg-slate-900/10 group-hover:bg-slate-900 flex items-center justify-center transition-all duration-300">
                            <svg className="w-4 h-4 text-slate-900 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">X / Twitter</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Service Areas */}
                {agencyData.serviceAreas && agencyData.serviceAreas.length > 0 && (
                  <div className="bg-gradient-to-br from-emerald-50/50 to-white rounded-xl p-5 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPinIcon className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">{t('agencyDetails:about.serviceAreas')}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agencyData.serviceAreas.map((area, index) => (
                        <span key={index} className="px-3 py-1.5 bg-white text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-default">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin-only: Agency Meta Stats */}
                {(isAdmin || isPlatformAdmin) && (
                  <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-5 border border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{t('adminStats.title', 'Agency Stats')}</h3>
                      <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{t('adminStats.adminOnly', 'Admin only')}</span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">{t('adminStats.profileViews', 'Profile Views')}</span>
                        <span className="font-semibold text-slate-800">{(agencyData as any).views ?? 0}</span>
                      </div>
                      {(agencyData.yearsInBusiness ?? 0) > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">{t('stats.yearsInBusiness', 'Years in Business')}</span>
                          <span className="font-semibold text-slate-800">{agencyData.yearsInBusiness}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">{t('adminStats.subscriptionPlan', 'Subscription Plan')}</span>
                        <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                          (agencyData as any).subscriptionPlan === 'free'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {(agencyData as any).subscriptionPlan ?? 'free'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">{t('adminStats.featuredStatus', 'Featured Status')}</span>
                        {(agencyData as any).isFeatured ? (
                          <span className="font-semibold text-amber-600 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            {t('adminStats.featured', 'Featured')}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">{t('adminStats.notFeatured', 'Not featured')}</span>
                        )}
                      </div>
                      {(agencyData as any).isFeatured && (agencyData as any).featuredEndDate && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">{t('adminStats.featuredUntil', 'Featured Until')}</span>
                          <span className="font-semibold text-slate-800">
                            {new Date((agencyData as any).featuredEndDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">{t('adminStats.memberSince', 'Member Since')}</span>
                        <span className="font-semibold text-slate-800">
                          {agencyData.createdAt ? new Date(agencyData.createdAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Expertise */}
              <div className="space-y-5">
                {/* Specialties */}
                {agencyData.specialties && agencyData.specialties.length > 0 && (
                  <div className="bg-gradient-to-br from-primary/5 to-white rounded-xl p-5 border border-primary/10">
                    <div className="flex items-center gap-2 mb-3">
                      <SparklesIcon className="w-5 h-5 text-primary" />
                      <h3 className="text-sm font-bold text-slate-900">{t('agencyDetails:about.specialties')}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agencyData.specialties.map((specialty, index) => (
                        <span key={index} className="px-3 py-1.5 bg-white text-primary rounded-lg text-xs font-semibold border border-primary/20 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-default">
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Specializations */}
                {agencyData.specializations && agencyData.specializations.length > 0 && (
                  <div className="bg-gradient-to-br from-violet-50/50 to-white rounded-xl p-5 border border-violet-100">
                    <div className="flex items-center gap-2 mb-3">
                      <AcademicCapIcon className="w-5 h-5 text-violet-600" />
                      <h3 className="text-sm font-bold text-slate-900">{t('agencyDetails:about.specializations')}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agencyData.specializations.map((spec, index) => (
                        <span key={index} className="px-3 py-1.5 bg-white text-violet-700 rounded-lg text-xs font-semibold border border-violet-200 shadow-sm hover:shadow-md hover:border-violet-300 transition-all cursor-default">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {agencyData.languages && agencyData.languages.length > 0 && (
                  <div className="bg-gradient-to-br from-sky-50/50 to-white rounded-xl p-5 border border-sky-100">
                    <div className="flex items-center gap-2 mb-3">
                      <GlobeAltIcon className="w-5 h-5 text-sky-600" />
                      <h3 className="text-sm font-bold text-slate-900">{t('agencyDetails:about.languagesSpoken')}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {agencyData.languages.map((lang, index) => (
                        <span key={index} className="px-3 py-1.5 bg-white text-sky-700 rounded-lg text-xs font-semibold border border-sky-200 shadow-sm hover:shadow-md hover:border-sky-300 transition-all cursor-default">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Promotion Coupons Section - visible to all agency members */}
            {(isAdmin || isPlatformAdmin || isAlreadyMember || isUserInThisAgency) && agencyData.promotionCoupons && (
              <div className="mt-6">
                <div className="p-5 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{t('coupons.promotionTitle', 'Promotion Coupons')}</h4>
                      <p className="text-xs text-slate-500">{t('coupons.promotionSubtitle', 'Monthly listing promotion allocation')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-violet-100 text-center">
                      <p className="text-2xl font-bold text-violet-600">{agencyData.promotionCoupons.monthly ?? 0}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t('coupons.monthly', 'Monthly')}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-violet-100 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{agencyData.promotionCoupons.available ?? 0}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t('coupons.available', 'Available')}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-violet-100 text-center">
                      <p className="text-2xl font-bold text-slate-600">{agencyData.promotionCoupons.used ?? 0}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t('coupons.used', 'Used')}</p>
                    </div>
                  </div>
                  {agencyData.promotionCoupons.monthly > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{t('coupons.usedThisMonth', 'Used this month')}</span>
                        <span>{agencyData.promotionCoupons.used ?? 0} / {agencyData.promotionCoupons.monthly}</span>
                      </div>
                      <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((agencyData.promotionCoupons.used ?? 0) / agencyData.promotionCoupons.monthly) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actual Coupon Codes */}
                  {agencyData.promotionCoupons.codes && agencyData.promotionCoupons.codes.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">{t('coupons.yourCodes', 'Your Coupon Codes')}</h5>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {agencyData.promotionCoupons.codes.map((coupon, idx) => {
                          const tierLabel = coupon.tier === 'highlight' ? 'Highlight' : coupon.tier === 'premium' ? 'Premium' : 'Featured';
                          const tierColor = coupon.tier === 'highlight'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : coupon.tier === 'premium'
                              ? 'bg-purple-100 text-purple-700 border-purple-200'
                              : 'bg-blue-100 text-blue-700 border-blue-200';
                          const statusColor = coupon.status === 'available'
                            ? 'bg-emerald-100 text-emerald-700'
                            : coupon.status === 'used'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-red-100 text-red-500';
                          const statusLabel = coupon.status === 'available'
                            ? t('coupons.available', 'Available')
                            : coupon.status === 'used'
                              ? t('coupons.used', 'Used')
                              : t('coupons.expired', 'Expired');

                          return (
                            <div key={idx} className={`flex items-center justify-between p-2.5 bg-white rounded-lg border ${coupon.status === 'used' ? 'border-slate-200 opacity-60' : 'border-violet-100'}`}>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${tierColor}`}>
                                  {tierLabel}
                                </span>
                                <code className={`text-xs font-mono font-semibold ${coupon.status === 'used' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                  {coupon.code}
                                </code>
                                {coupon.status === 'available' && (
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(coupon.code);
                                      success(t('coupons.codeCopied', 'Code copied!'));
                                    }}
                                    className="p-1 text-slate-400 hover:text-violet-600 transition-colors"
                                    title={t('coupons.copyCode', 'Copy code')}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {coupon.usedBy && (
                                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                                    {coupon.usedBy.name}
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusColor}`}>
                                  {statusLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Admin Section - Agent Registration Codes & other admin content */}
            {(isAdmin || isPlatformAdmin) && (
              <div className="mt-6 space-y-4">

                {/* Agent Registration Codes */}
                {agencyData.agentCoupons && agencyData.agentCoupons.coupons && agencyData.agentCoupons.coupons.length > 0 && (
                  <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{t('coupons.agentCodesTitle', 'Agent Registration Codes')}</h4>
                        <p className="text-xs text-slate-500">
                          <span className="text-emerald-600 font-medium">{agencyData.agentCoupons.available} {t('coupons.available', 'available')}</span>
                          {' · '}
                          <span className="text-slate-500">{agencyData.agentCoupons.used} {t('coupons.used', 'used')}</span>
                          {agencyData.agentCoupons.total > 0 && (
                            <> · <span className="text-slate-400">{agencyData.agentCoupons.total} {t('coupons.total', 'total')}</span></>
                          )}
                          {agencyData.agentCoupons.expired > 0 && (
                            <> · <span className="text-red-400">{agencyData.agentCoupons.expired} {t('coupons.expired', 'expired')}</span></>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Usage bar */}
                    {agencyData.agentCoupons.total > 0 && (
                      <div className="mb-4">
                        <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (agencyData.agentCoupons.used / agencyData.agentCoupons.total) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-1 text-right">{t('coupons.seatsFilled', '{{used}} of {{total}} seats filled', { used: agencyData.agentCoupons.used, total: agencyData.agentCoupons.total })}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      {agencyData.agentCoupons.coupons.map((coupon: any) => (
                        <div
                          key={coupon.code}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            coupon.status === 'used'
                              ? 'bg-slate-50 border-slate-200'
                              : coupon.status === 'expired'
                                ? 'bg-red-50 border-red-200 opacity-60'
                                : 'bg-white border-emerald-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <code className={`font-mono text-sm font-bold tracking-widest ${
                              coupon.status === 'used' ? 'text-slate-400 line-through' : 'text-slate-900'
                            }`}>
                              {coupon.code}
                            </code>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              coupon.status === 'available' ? 'bg-emerald-100 text-emerald-700'
                                : coupon.status === 'used' ? 'bg-slate-100 text-slate-500'
                                : 'bg-red-100 text-red-600'
                            }`}>
                              {coupon.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {coupon.status === 'used' ? (
                              <span className="text-xs text-slate-500">
                                {t('messages.usedBy', 'Used by')} <strong className="text-slate-700">{coupon.usedBy?.name ?? t('messages.unknown', 'Unknown')}</strong>
                              </span>
                            ) : coupon.status === 'available' ? (
                              <button
                                onClick={async () => {
                                  navigator.clipboard.writeText(coupon.code);
                                  await success(t('messages.copiedTitle', 'Copied!'), t('messages.invitationCodeCopied', 'Invitation code copied to clipboard!'));
                                }}
                                className="text-xs px-3 py-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
                              >
                                {t('invitationCode.copy', 'Copy')}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              {/* Invitation Code — always visible at top for admins */}
              {(isAdmin || isPlatformAdmin) && (
                <div className="mb-5 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldCheckIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <h4 className="font-semibold text-slate-900 text-sm">{t('invitationCode.title', 'Invitation Code')}</h4>
                    <span className="text-xs text-slate-400">{t('invitationCode.description', 'Share with agents to join your agency')}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {agencyData.invitationCode ? (
                      <>
                        <code className="px-3 py-2 bg-white border border-amber-200 rounded-lg font-mono text-sm font-bold text-slate-900 tracking-widest shadow-sm">
                          {agencyData.invitationCode}
                        </code>
                        <button
                          onClick={async () => {
                            navigator.clipboard.writeText(agencyData.invitationCode || '');
                            await success(t('messages.copiedTitle', 'Copied!'), t('messages.invitationCodeCopied', 'Invitation code copied to clipboard!'));
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {t('invitationCode.copy', 'Copy')}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            const token = tokenService.getAccessToken();
                            await _ensureCsrf();
                            const response = await fetch(`${API_URL}/agencies/${agencyData._id || agencyData.id}`, {
                              method: 'PUT',
                              credentials: 'include',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                                ..._csrfHeaders(),
                              },
                              body: JSON.stringify({ generateInvitationCode: true }),
                            });
                            if (!response.ok) throw new Error('Failed to generate code');
                            const data = await response.json();
                            if (data.agency?.invitationCode) {
                              setAgencyData(prev => ({ ...prev, invitationCode: data.agency.invitationCode }));
                              await success(t('invitationCode.generatedTitle', 'Code Generated'), t('invitationCode.generatedMessage', 'Invitation code has been generated successfully'));
                            }
                          } catch {
                            await error(t('messages.errorTitle', 'Error'), t('invitationCode.generateFailed', 'Failed to generate invitation code'));
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t('invitationCode.generate', 'Generate Code')}
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
                      dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
                      dispatch({ type: 'SET_AGENCY_DASHBOARD_SECTION', payload: 'overview' });
                      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agency-dashboard' });
                      window.history.pushState({}, '', '/agency-dashboard');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-600/25"
                  >
                    <ChartBarIcon className="w-4 h-4" />
                    {t('actions.goToDashboard', 'Go to Dashboard')}
                  </button>
                  <button
                    onClick={handleOpenEditModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all duration-300 shadow-lg shadow-slate-900/25"
                  >
                    <PencilIcon className="w-4 h-4" />
                    {t('actions.editAgency', 'Edit Agency')}
                  </button>
                  <button
                    onClick={() => {
                      setIsJoinRequestsModalOpen(true);
                      setPendingJoinRequestCount(0);
                    }}
                    className="relative inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/25"
                  >
                    <BellIcon className="w-4 h-4" />
                    {t('actions.manageJoinRequests', 'Manage Join Requests')}
                    {pendingJoinRequestCount > 0 && (
                      <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                        {pendingJoinRequestCount}
                      </span>
                    )}
                  </button>
                </>
              )}

              {!isAdmin && isUserInThisAgency && (
                <button
                  onClick={() => {
                    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: null });
                    dispatch({ type: 'SET_SELECTED_AGENCY', payload: null });
                    dispatch({ type: 'SET_AGENCY_DASHBOARD_SECTION', payload: 'overview' });
                    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agency-dashboard' });
                    window.history.pushState({}, '', '/agency-dashboard');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-600/25"
                >
                  <ChartBarIcon className="w-4 h-4" />
                  {t('actions.goToDashboard', 'Go to Dashboard')}
                </button>
              )}

              {canRequestToJoin && (
                <button
                  onClick={handleRequestToJoin}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all duration-300 shadow-lg shadow-emerald-600/25"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  {t('actions.requestToJoin', 'Request to Join Agency')}
                </button>
              )}

              {/* Show upgrade prompt for agents without Pro subscription who want to use invitation codes */}
              {canRequestToJoin && !hasProSubscription && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg border border-amber-200">
                  <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
                  {t('actions.proRequiredForInviteCode', 'Pro subscription required for invitation codes. Use a coupon code to join.')}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>

        {/* Featured Subscription Section - Only visible to agency owner */}
        {isOwner && (
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 md:p-8 mb-8 border border-slate-100 overflow-hidden relative">
            {/* Decorative gradient */}
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-violet-500/5 via-purple-500/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/4"></div>

            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <StarIcon className="w-5 h-5 text-white fill-current" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{t('agencyDetails:featuredSubscription.title')}</h2>
                    <p className="text-xs text-slate-500">{t('agencyDetails:featuredSubscription.subtitle')}</p>
                  </div>
                </div>
              </div>

              <FeaturedSubscriptionCard
                key={subscriptionKey}
                agencyId={agencyData._id}
                onUpgrade={() => setIsFeaturedSubscriptionDialogOpen(true)}
              />

              <div className="mt-5 p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-violet-700">{t('agencyDetails:featuredSubscription.proTip')}</span> {t('agencyDetails:featuredSubscription.proTipMessage')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Team Members Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <UserGroupIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t('agencyDetails:teamMembers.title')}</h2>
                <p className="text-xs text-slate-500">{t('agencyDetails:teamMembers.rankedByPerformance', '{{count}} agents \u2022 Ranked by performance', { count: agents.length })}</p>
              </div>
            </div>
            <button
              onClick={() => setShowAllMembers(!showAllMembers)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <TrophyIcon className="w-4 h-4 text-amber-500" />
              {showAllMembers ? t('agencyDetails:teamMembers.showTopPerformers') : t('agencyDetails:teamMembers.showAllMembers')}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/30 border-t-primary"></div>
                <p className="text-sm text-slate-500">{t('agencyDetails:teamMembers.loading', 'Loading team members...')}</p>
              </div>
            </div>
          ) : rankedAgents.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(showAllMembers ? rankedAgents : rankedAgents.slice(0, 3)).map((agent, index) => {
                const rank = getRankBadge(index);
                const agentId = agent.id || agent._id || '';
                const isAgentAdmin = agentId && agencyData.admins && agencyData.admins.some(adminId =>
                  String(adminId) === String(agentId)
                );
                const isAgentOwner = agentId && agencyOwnerId && String(agentId) === String(agencyOwnerId);

                return (
                  <div
                    key={agentId}
                    onClick={() => handleAgentClick(agentId)}
                    className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-slate-100 hover:border-primary/30 active:scale-[0.98]"
                  >
                    {/* Top accent bar */}
                    <div className={`h-1 bg-gradient-to-r ${rank.color}`} />

                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Agent Photo with Rank */}
                        <div className="relative flex-shrink-0">
                          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-md group-hover:shadow-lg transition-shadow">
                            <UserAvatar src={agent.avatarUrl} alt={agent.name} gender={agent.gender} seed={agent.agentId || agent._id || agent.name} avatarOptions={agent.avatarOptions} className="w-full h-full object-cover" />
                          </div>
                          {/* Rank badge on avatar */}
                          <div className={`absolute -top-2 -left-2 px-2 py-0.5 bg-gradient-to-r ${rank.color} text-white text-[10px] font-bold rounded-lg shadow-md flex items-center gap-1`}>
                            {rank.emoji && <span>{rank.emoji}</span>}
                            <span>{rank.text}</span>
                          </div>
                          {/* Rating badge */}
                          {agent.stats?.rating != null && agent.stats.rating >= 4.0 && (
                            <div className="absolute -bottom-1.5 -right-1.5 bg-amber-500 text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow flex items-center gap-0.5">
                              <StarIcon className="w-2.5 h-2.5 fill-current" />
                              {agent.stats.rating.toFixed(1)}
                            </div>
                          )}
                        </div>

                        {/* Agent Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors truncate">{agent.name}</h3>
                            {isAgentOwner && (
                              <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-[10px] font-bold rounded-md flex items-center gap-0.5">
                                <ShieldCheckIcon className="w-2.5 h-2.5" />
                                {t('agencyDetails:teamMembers.owner')}
                              </span>
                            )}
                            {isAgentAdmin && !isAgentOwner && (
                              <span className="px-2 py-0.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[10px] font-bold rounded-md flex items-center gap-0.5">
                                <ShieldCheckIcon className="w-2.5 h-2.5" />
                                {t('agencyDetails:teamMembers.admin')}
                              </span>
                            )}
                          </div>

                          {/* Location */}
                          {(agent.city || agent.country) && (
                            <div className="flex items-center gap-1 text-slate-500 mb-1">
                              <MapPinIcon className="w-3 h-3 text-primary/60" />
                              <span className="text-xs">
                                {[agent.city, agent.country].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}

                          {agent.licenseNumber && (
                            <p className="text-[11px] text-slate-400 mb-2">{t('agencyDetails:teamMembers.license')}: {agent.licenseNumber}</p>
                          )}
                        </div>

                        <ChevronRightIcon className="w-5 h-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                      </div>

                      {/* Performance Stats */}
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-2.5 text-center">
                          <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-200/30 rounded-full blur-lg" />
                          <p className="text-lg font-bold text-slate-800">
                            {formatPrice(agent.stats?.totalSalesValue || 0, agency.country || 'Serbia').replace(/\.\d+/, '').replace(/\s/g, '')}
                          </p>
                          <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">{t('agencyDetails:teamMembers.totalSales')}</p>
                        </div>
                        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-2.5 text-center">
                          <div className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-200/30 rounded-full blur-lg" />
                          <p className="text-lg font-bold text-emerald-600">{agent.stats?.propertiesSold || 0}</p>
                          <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">{t('agencyDetails:teamMembers.propertiesSold')}</p>
                        </div>
                        <div className="relative overflow-hidden bg-gradient-to-br from-sky-50 to-sky-100/50 rounded-xl p-2.5 text-center">
                          <div className="absolute -top-3 -right-3 w-8 h-8 bg-sky-200/30 rounded-full blur-lg" />
                          <p className="text-lg font-bold text-sky-600">{agent.stats?.activeListings || 0}</p>
                          <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">{t('agencyDetails:teamMembers.activeListings')}</p>
                        </div>
                      </div>

                      {/* Contact and Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        {agent.phone && (
                          <a
                            href={`tel:${agent.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600 hover:bg-primary hover:text-white transition-all"
                          >
                            <PhoneIcon className="w-3.5 h-3.5" />
                            {agent.phone}
                          </a>
                        )}

                        {/* Admin Actions - Only visible to owner */}
                        {isOwner && !isAgentOwner && (
                          <div className="flex gap-1.5 ml-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAdmin(agentId, agent.name, isAgentAdmin || false);
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                                isAgentAdmin
                                  ? 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                                  : 'text-sky-600 bg-sky-50 hover:bg-sky-100'
                              }`}
                              title={isAgentAdmin ? 'Remove admin rights' : 'Make admin'}
                            >
                              <ShieldCheckIcon className="w-3 h-3" />
                              {isAgentAdmin ? t('agencyDetails:teamMembers.removeAdmin') : t('agencyDetails:teamMembers.makeAdmin')}
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAgent(agentId, agent.name);
                              }}
                              disabled={removingAgentId === agentId}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
                              title="Remove agent from agency"
                            >
                              {removingAgentId === agentId ? (
                                <>
                                  <div className="animate-spin rounded-full h-2.5 w-2.5 border-b border-red-600"></div>
                                  {t('agencyDetails:teamMembers.removing')}
                                </>
                              ) : (
                                <>
                                  <XMarkIcon className="w-3 h-3" />
                                  {t('agencyDetails:teamMembers.remove')}
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Leave Agency Button - Only visible to current user who is not the owner */}
                        {!isOwner && currentUser && agentId && (String(agentId) === String(currentUser.id) || String(agentId) === String(currentUser._id)) && !isAgentOwner && (
                          <div className="flex gap-1.5 ml-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLeaveAgency();
                              }}
                              disabled={isLeavingAgency}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
                              title="Leave this agency"
                            >
                              {isLeavingAgency ? (
                                <>
                                  <div className="animate-spin rounded-full h-2.5 w-2.5 border-b border-red-600"></div>
                                  {t('agencyDetails:teamMembers.leaving')}
                                </>
                              ) : (
                                <>
                                  <XMarkIcon className="w-3 h-3" />
                                  {t('agencyDetails:teamMembers.leaveAgency')}
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                
              );
              })}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UsersIcon className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">{t('agencyDetails:teamMembers.noAgentsFound')}</p>
              <p className="text-sm text-slate-400 mt-1">{t('agencyDetails:teamMembers.noAgentsHelpText', 'Team members will appear here once they join')}</p>
            </div>
          )}
        </div>

        {/* Properties Map Section */}
        {agencyProperties.length > 0 && agencyProperties.some(p => p.lat && p.lng) && (
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 md:p-8 mb-8 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <MapIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t('agencyDetails:properties.map', 'Properties Map')}</h2>
                <p className="text-xs text-slate-500">
                  ({t('agencyDetails:properties.activeCount', '{{count}} active', { count: activeProperties.length })}, {t('agencyDetails:properties.soldCount', '{{count}} sold', { count: soldProperties.length })})
                </p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
              <MapContainer
                center={propertiesWithCoords[0] ? [propertiesWithCoords[0].lat!, propertiesWithCoords[0].lng!] : [agencyData.lat ?? 42.0, agencyData.lng ?? 21.0]}
                zoom={12}
                scrollWheelZoom={true}
                className="w-full h-[400px] md:h-[500px]"
                maxZoom={23}
                minZoom={3}
              >
                <TileLayer
                  attribution='&copy; Google Maps'
                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  maxZoom={22}
                />
                <MapInvalidator />
                {propertiesWithCoords.map((property) => (
                  <Marker
                    key={property.id || property._id}
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
                      <div className="min-w-[250px]">
                        {property.imageUrl && (
                          <img src={property.imageUrl} alt={`Property for sale in ${property.city}, ${property.country} - ${property.address}`} className="w-full h-32 object-cover rounded-lg mb-2" loading="lazy" />
                        )}
                        <p className="font-semibold text-sm mb-1 text-slate-900 line-clamp-2">{property.address}</p>
                        <p className="text-xs text-slate-500 mb-2">{property.city}, {property.country}</p>
                        <p className="font-bold text-emerald-600 mb-2">{formatPrice(property.price, property.country)}</p>
                        <div className="flex gap-2 text-xs text-slate-600 mb-3">
                          <span>{property.beds} {t('agencyDetails:properties.beds', 'beds')}</span>
                          <span>•</span>
                          <span>{property.baths} {t('agencyDetails:properties.baths', 'baths')}</span>
                          <span>•</span>
                          <span>{property.sqft} m²</span>
                        </div>
                        <button
                          onClick={() => {
                            const propertyId = property.id || property._id;
                            dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
                            window.history.pushState({}, '', `/property/${propertyId}`);
                          }}
                          className={`w-full text-white px-3 py-2 rounded-lg font-semibold text-sm ${property.status === 'sold' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        >
                          {t('agencyDetails:properties.viewDetails', 'View Details')}
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
                <span className="text-slate-600">{t('agencyDetails:properties.forSaleCount', 'For Sale ({{count}})', { count: activeProperties.length })}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-slate-600">{t('agencyDetails:properties.soldCountLabel', 'Sold ({{count}})', { count: soldProperties.length })}</span>
              </div>
            </div>
          </div>
        )}

        {/* Service Area Location Map */}
        {agencyData.lat != null && agencyData.lng != null && !isNaN(agencyData.lat) && !isNaN(agencyData.lng) && (
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 md:p-8 mb-8 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
                <MapPinIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t('agencyDetails:properties.serviceAreaLocation', 'Service Area Location')}</h2>
                <p className="text-xs text-slate-500">{agencyData.city}, {agencyData.country}</p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
              <MapContainer
                center={[agencyData.lat, agencyData.lng]}
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
                <Marker
                  position={[agencyData.lat, agencyData.lng]}
                  icon={L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                  })}
                >
                  <Popup>
                    <div className="text-center min-w-[200px]">
                      {agencyData.logo && (
                        <div className="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden border-2 border-slate-300 flex-shrink-0">
                          <img src={agencyData.logo} alt={agencyData.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <h3 className="font-bold text-slate-900">{agencyData.name}</h3>
                      {agencyData.address && <p className="text-sm text-slate-600 mt-1">{agencyData.address}</p>}
                      <p className="text-sm font-medium text-slate-700">{agencyData.city}, {agencyData.country}</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        )}

        {/* Properties Section with Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 md:p-8 border border-slate-100">
          {/* Section Header with Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <HomeIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t('agencyDetails:properties.portfolio', 'Property Portfolio')}</h2>
                <p className="text-xs text-slate-500">{t('agencyDetails:properties.totalProperties', '{{count}} total properties', { count: agencyProperties.length })}</p>
              </div>
            </div>

            {/* Tab Buttons */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setPropertyView('active')}
                className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  propertyView === 'active'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${propertyView === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                {t('agencyDetails:properties.activeListingsTitle')}
                <span className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-md ${
                  propertyView === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {activeProperties.length}
                </span>
              </button>
              <button
                onClick={() => setPropertyView('sold')}
                className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  propertyView === 'sold'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${propertyView === 'sold' ? 'bg-amber-500' : 'bg-slate-300'}`}></span>
                {t('agencyDetails:properties.soldPropertiesTitle')}
                <span className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-md ${
                  propertyView === 'sold' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {soldProperties.length}
                </span>
              </button>
              {rentedProperties.length > 0 && (
                <button
                  onClick={() => setPropertyView('rented')}
                  className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    propertyView === 'rented'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${propertyView === 'rented' ? 'bg-orange-500' : 'bg-slate-300'}`}></span>
                  {t('agencyDetails:properties.rented', 'Rented')}
                  <span className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-md ${
                    propertyView === 'rented' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {rentedProperties.length}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Listing Type Filter (Sale / Rent) */}
          {(() => {
            const allProps = [...activeProperties, ...soldProperties, ...rentedProperties];
            const currentProps = propertyView === 'active' ? activeProperties : propertyView === 'sold' ? soldProperties : rentedProperties;
            const allSaleCount = allProps.filter(p => (p.listingType || 'sale') === 'sale').length;
            const allRentCount = allProps.filter(p => p.listingType === 'rent').length;
            const saleCount = currentProps.filter(p => (p.listingType || 'sale') === 'sale').length;
            const rentCount = currentProps.filter(p => p.listingType === 'rent').length;
            if (allSaleCount > 0 && allRentCount > 0) {
              return (
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setPropertyTypeView('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      propertyTypeView === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t('agencyDetails:properties.allCount', 'All ({{count}})', { count: currentProps.length })}
                  </button>
                  <button
                    onClick={() => setPropertyTypeView('sale')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      propertyTypeView === 'sale' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {t('agencyDetails:properties.forSaleCount', 'For Sale ({{count}})', { count: saleCount })}
                  </button>
                  <button
                    onClick={() => setPropertyTypeView('rent')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      propertyTypeView === 'rent' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {t('agencyDetails:properties.forRentCount', 'For Rent ({{count}})', { count: rentCount })}
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {/* Properties Grid */}
          {(() => {
            const baseProps = propertyView === 'active' ? activeProperties : propertyView === 'sold' ? soldProperties : rentedProperties;
            const displayProps = propertyTypeView === 'all' ? baseProps : baseProps.filter(p => (p.listingType || 'sale') === propertyTypeView);
            if (loading) {
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3].map(i => <PropertyCardSkeleton key={i} />)}
                </div>
              );
            }
            if (displayProps.length > 0) {
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {displayProps.map(property => (
                    <PropertyCard key={property.id || property._id} property={property} />
                  ))}
                </div>
              );
            }
            return (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <HomeIcon className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">
                  {propertyView === 'active' ? t('agencyDetails:properties.noActiveListings') : t('agencyDetails:properties.noSoldProperties')}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {propertyView === 'active' ? t('agencyDetails:properties.checkBackSoon') : t('agencyDetails:properties.soldWillAppear')}
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Join Requests Modal */}
      <AgencyJoinRequestsModal
        isOpen={isJoinRequestsModalOpen}
        onClose={() => {
          setIsJoinRequestsModalOpen(false);
          setPendingJoinRequestCount(0);
        }}
        agencyId={agency._id}
        agencyName={agency.name}
        refreshKey={joinRequestsRefreshKey}
      />

      {/* Invitation Code Modal */}
      <InvitationCodeModal
        isOpen={isInvitationCodeModalOpen}
        onClose={() => setIsInvitationCodeModalOpen(false)}
        onSubmit={handleSubmitInvitationCode}
        agencyName={agency.name}
        hasProSubscription={hasProSubscription}
      />

      {/* Featured Subscription Dialog */}
      <FeaturedSubscriptionDialog
        isOpen={isFeaturedSubscriptionDialogOpen}
        onClose={() => setIsFeaturedSubscriptionDialogOpen(false)}
        agencyId={agencyData._id}
        onSuccess={handleSubscriptionSuccess}
      />

      {/* Edit Agency Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/25">
                  <PencilIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{t('agencyDetails:editModal.title')}</h3>
                  <p className="text-xs text-slate-500">{t('agencyDetails:editModal.subtitle', 'Update your agency information')}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  {t('agencyDetails:editModal.basicInfo')}
                </h4>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t('agencyDetails:editModal.agencyName')} {t('agencyDetails:common.required', '*')}
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t('agencyDetails:editModal.description')}
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => {
                      if (e.target.value.length <= 5000) {
                        setEditForm({ ...editForm, description: e.target.value });
                      }
                    }}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm resize-none ${
                      editForm.description.length > 4800 ? 'border-amber-300' : 'border-slate-200'
                    }`}
                    rows={4}
                    placeholder="Tell clients about your agency..."
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-slate-400">{t('agencyDetails:editModal.descriptionHint', 'Use line breaks to separate paragraphs')}</p>
                    <span className={`text-xs ${
                      editForm.description.length > 4800 ? 'text-amber-500 font-medium' : 'text-slate-400'
                    }`}>
                      {editForm.description.length}/5,000
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      {t('agencyDetails:editModal.email')} {t('agencyDetails:common.required', '*')}
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      {t('agencyDetails:editModal.phone')} {t('agencyDetails:common.required', '*')}
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      {t('agencyDetails:editModal.website')}
                    </label>
                    <input
                      type="url"
                      value={editForm.website}
                      onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      {t('agencyDetails:editModal.yearsInBusiness')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.yearsInBusiness}
                      onChange={(e) => setEditForm({ ...editForm, yearsInBusiness: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {t('agencyDetails:editModal.location')}
                </h4>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t('agencyDetails:editModal.address')}
                  </label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      {t('agencyDetails:editModal.city')}
                    </label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      {t('agencyDetails:editModal.country')}
                    </label>
                    <input
                      type="text"
                      value={editForm.country}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      {t('agencyDetails:editModal.zipCode')}
                    </label>
                    <input
                      type="text"
                      value={editForm.zipCode}
                      onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                    />
                  </div>
                </div>

                {/* Map Location Picker - Same as listing creation */}
                <MapLocationPicker
                  lat={editForm.lat ?? 42.0}
                  lng={editForm.lng ?? 21.0}
                  address={editForm.address}
                  country={editForm.country}
                  city={editForm.city}
                  onLocationChange={(lat, lng) => setEditForm(prev => ({ ...prev, lat, lng }))}
                  onAddressChange={(address) => setEditForm(prev => ({ ...prev, address }))}
                />
              </div>

              {/* Social Media */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                  {t('agencyDetails:editModal.socialMedia')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      {t('agencyDetails:editModal.facebookUrl')}
                    </label>
                    <input
                      type="url"
                      value={editForm.facebookUrl}
                      onChange={(e) => setEditForm({ ...editForm, facebookUrl: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      {t('agencyDetails:editModal.instagramUrl')}
                    </label>
                    <input
                      type="url"
                      value={editForm.instagramUrl}
                      onChange={(e) => setEditForm({ ...editForm, instagramUrl: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      {t('agencyDetails:editModal.linkedinUrl')}
                    </label>
                    <input
                      type="url"
                      value={editForm.linkedinUrl}
                      onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                      placeholder="https://linkedin.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      {t('agencyDetails:editModal.twitterUrl')}
                    </label>
                    <input
                      type="url"
                      value={editForm.twitterUrl}
                      onChange={(e) => setEditForm({ ...editForm, twitterUrl: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                </div>
              </div>

              {/* Specialties & Certifications */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                  {t('agencyDetails:editModal.specialtiesCerts')}
                </h4>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t('agencyDetails:editModal.specialtiesLabel')}
                  </label>
                  <input
                    type="text"
                    value={editForm.specialties.join(', ')}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      specialties: e.target.value.split(',').map(s => s.trim())
                    })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                    placeholder="Residential, Commercial, Luxury Properties"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t('agencyDetails:editModal.certificationsLabel')}
                  </label>
                  <input
                    type="text"
                    value={editForm.certifications.join(', ')}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      certifications: e.target.value.split(',').map(s => s.trim())
                    })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                    placeholder="Licensed Real Estate Agency, ISO Certified"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t('agencyDetails:editModal.languagesLabel')}
                  </label>
                  <input
                    type="text"
                    value={editForm.languages.join(', ')}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      languages: e.target.value.split(',').map(s => s.trim())
                    })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                    placeholder="English, Serbian, Croatian, Albanian"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">{t('agencyDetails:editModal.languagesHint')}</p>
                </div>
              </div>

              {/* Business Hours */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  {t('agencyDetails:editModal.businessHours')}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <div key={day}>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5 capitalize">
                        {day.slice(0, 3)}
                      </label>
                      <input
                        type="text"
                        value={editForm.businessHours[day as keyof typeof editForm.businessHours]}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          businessHours: { ...editForm.businessHours, [day]: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-xs"
                        placeholder="9AM - 6PM"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Achievements Section */}
              <div className="space-y-4 border-t border-slate-100 pt-6">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  {t('agencyDetails:editModal.achievements', 'Awards & Achievements')}
                </h4>
                <AchievementsSection
                  achievements={agencyAchievements}
                  isOwner={isOwner || isAdmin}
                  onAdd={handleAddAchievement}
                  onEdit={handleEditAchievement}
                  onDelete={handleDeleteAchievement}
                  entityType="agency"
                  className="bg-slate-50 rounded-xl p-4"
                />
              </div>
            </div>

            {/* Action Buttons - Fixed Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-white font-medium transition-colors text-sm"
              >
                {t('agencyDetails:common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveAgency}
                className="flex-1 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium transition-colors text-sm shadow-lg shadow-primary/25"
              >
                {t('agencyDetails:editModal.saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AgencyDetailPage;

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAppContext } from '../context/AppContext';
import { BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, StarIcon, ArrowLeftIcon, UserCircleIcon, BellIcon, TrophyIcon, ChartBarIcon, HomeIcon, UsersIcon, XMarkIcon, ShieldCheckIcon, PencilIcon } from '../constants';
import PropertyCard from '../src/features/property-details/components/PropertyCard';
import PropertyCardSkeleton from '../src/features/property-details/components/PropertyCardSkeleton';
import AgencyJoinRequestsModal from './AgencyJoinRequestsModal';
import InvitationCodeModal from './InvitationCodeModal';
import FeaturedSubscriptionCard from './shared/FeaturedSubscriptionCard';
import FeaturedSubscriptionDialog from './shared/FeaturedSubscriptionDialog';
import { formatPrice } from '../utils/currency';
import { createJoinRequest, removeAgentFromAgency, addAgencyAdmin, removeAgencyAdmin, verifyInvitationCode, leaveAgency } from '../services/apiService';
import { Agency } from '../types';
import { socketService } from '../services/socketService';
import { SEO, Breadcrumbs, generateAgencyBreadcrumbs } from '../src/components/seo';
import { useTrackView } from '../src/features/view-stats/hooks';
import { useConfirmation } from '../src/shared/hooks/useConfirmation';

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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Agent {
  agentId: string;
  _id?: string;
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  rating?: number;
  totalSalesValue?: number;
  propertiesSold?: number;
  activeListings?: number;
  licenseNumber?: string;
  stats?: {
    totalSalesValue?: number;
    propertiesSold?: number;
    rating?: number;
    activeListings?: number;
  };
}

// Extended Agency type to include optional id for compatibility
interface ExtendedAgency extends Agency {
  id?: string;
}

interface AgencyDetailPageProps {
  agency: ExtendedAgency;
}

// Gradient presets for agency banners
const GRADIENT_PRESETS = [
  { id: 'default', name: 'Ocean Blue', gradient: 'from-blue-600 via-blue-700 to-indigo-900' },
  { id: 'sunset', name: 'Sunset', gradient: 'from-orange-500 via-pink-500 to-purple-600' },
  { id: 'forest', name: 'Forest', gradient: 'from-green-600 via-teal-600 to-cyan-700' },
  { id: 'royal', name: 'Royal Purple', gradient: 'from-purple-600 via-purple-700 to-indigo-900' },
  { id: 'fire', name: 'Fire', gradient: 'from-red-600 via-orange-600 to-yellow-500' },
  { id: 'night', name: 'Night Sky', gradient: 'from-gray-900 via-blue-900 to-purple-900' },
  { id: 'mint', name: 'Mint Fresh', gradient: 'from-emerald-400 via-teal-500 to-cyan-600' },
  { id: 'rose', name: 'Rose Gold', gradient: 'from-pink-400 via-rose-400 to-red-500' },
];

const AgencyDetailPage: React.FC<AgencyDetailPageProps> = ({ agency }) => {
  const { t } = useTranslation('agencyDetails');
  const { state, dispatch } = useAppContext();
  const { currentUser, isAuthenticated } = state;
  const { confirm } = useConfirmation();

  // Track page view for analytics
  useTrackView({
    entityType: 'agency',
    entityId: agency._id || agency.id,
    enabled: !!(agency._id || agency.id),
  });

  const [agents, setAgents] = useState<Agent[]>([]);
  const [agencyProperties, setAgencyProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJoinRequestsModalOpen, setIsJoinRequestsModalOpen] = useState(false);
  const [isInvitationCodeModalOpen, setIsInvitationCodeModalOpen] = useState(false);
  const [isFeaturedSubscriptionDialogOpen, setIsFeaturedSubscriptionDialogOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [agencyData, setAgencyData] = useState<Agency>(agency);
  const [uploadError, setUploadError] = useState('');
  const [removingAgentId, setRemovingAgentId] = useState<string | null>(null);
  const [showAllMembers, setShowAllMembers] = useState(true);
  const [isLeavingAgency, setIsLeavingAgency] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [propertyView, setPropertyView] = useState<'active' | 'sold'>('active');
  const [subscriptionKey, setSubscriptionKey] = useState(0);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
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

  // Check if current user is already a member of this agency
  const isAlreadyMember = currentUser && agents.some(agent => {
    const agentUserId = agent.agentId || agent._id || agent.id;
    return String(agentUserId) === String(currentUser.id) || String(agentUserId) === String(currentUser._id);
  });

  const canRequestToJoin = isAuthenticated && currentUser?.role === 'agent' && !currentUser?.agencyId && !isAlreadyMember;

  // Scroll to top on mount and when agency changes
  useEffect(() => {
    window.scrollTo(0, 0);
    fetchAgencyData();
  }, [agency._id]);

  // Listen for real-time agency updates (new members, etc.)
  useEffect(() => {
    const handleAgencyUpdate = (data: any) => {
      console.log('🏢 Agency update event received:', data);

      if (data.type === 'member-added' || data.type === 'member-removed') {
        // Refetch agency data to get the updated member list
        fetchAgencyData();
      }
    };

    const unsubscribe = socketService.onAgencyUpdate(agency._id, handleAgencyUpdate);

    return () => {
      unsubscribe();
    };
  }, [agency._id]);

  const fetchAgencyData = async () => {
    setLoading(true);
    try {
      // Fetch fresh agency data from the backend to get updated agents list and properties
      // Include auth token so backend can identify current user and auto-add owner as member
      const token = localStorage.getItem('balkan_estate_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/agencies/${agency._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setAgencyData(data.agency);
        setAgents(data.agency.agents || []);
        setAgencyProperties(data.properties || []);
        console.log('✅ Agency data refreshed, agents:', data.agency.agents?.length || 0, 'properties:', data.properties?.length || 0);
      } else {
        // Fallback to prop data if API fails
        setAgencyData(agency);
        setAgents(agency.agents || []);
        setAgencyProperties([]);
      }
    } catch (error) {
      console.error('Failed to fetch agency data:', error);
      // Fallback to prop data on error
      setAgencyData(agency);
      setAgents(agency.agents || []);
      setAgencyProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Sort agents by performance
  const rankedAgents = [...agents].sort((a, b) => {
    const scoreA = (a.stats?.totalSalesValue || 0) + (a.stats?.propertiesSold || 0) * 10000 + (a.stats?.rating || 0) * 5000;
    const scoreB = (b.stats?.totalSalesValue || 0) + (b.stats?.propertiesSold || 0) * 10000 + (b.stats?.rating || 0) * 5000;
    return scoreB - scoreA;
  });

  // Calculate sales statistics (use backend data if available, otherwise calculate)
  const soldProperties = agencyProperties.filter(p => p.status === 'sold');
  const salesLast12Months = agencyData.salesStats?.salesLast12Months ?? soldProperties.filter(p => {
    if (!p.soldAt) return false;
    const twelveMonthsAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    return p.soldAt >= twelveMonthsAgo;
  }).length;

  const totalSales = agencyData.salesStats?.totalSales ?? soldProperties.length;
  const minPrice = agencyData.salesStats?.minPrice ?? (soldProperties.length > 0 ? Math.min(...soldProperties.map(p => p.price).filter(Boolean)) : 0);
  const maxPrice = agencyData.salesStats?.maxPrice ?? (soldProperties.length > 0 ? Math.max(...soldProperties.map(p => p.price).filter(Boolean)) : 0);
  const averagePrice = agencyData.salesStats?.averagePrice ?? (soldProperties.length > 0
    ? soldProperties.map(p => p.price).filter(Boolean).reduce((sum, price) => sum + price, 0) / soldProperties.filter(p => p.price).length
    : 0);

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
    console.log('🔍 Viewing agent profile:', agentIdentifier);
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
      // Verify the invitation code
      const verification = await verifyInvitationCode(agency._id, code);

      if (!verification.valid) {
        throw new Error(verification.message || 'Invalid invitation code');
      }

      // If code is valid, send join request with the code
      await createJoinRequest(agency._id, `Joining with invitation code: ${code}`);
      alert('Join request sent successfully! The agency admin will review your request.');
      setIsInvitationCodeModalOpen(false);
    } catch (error) {
      throw error; // Let the modal handle the error display
    }
  };

  const handleToggleAdmin = async (agentId: string, agentName: string, isCurrentlyAdmin: boolean) => {
    if (!isOwner) {
      alert(t('messages.onlyOwnerCanManage'));
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
        alert(t('messages.adminRemoved', { name: agentName }));
      } else {
        await addAgencyAdmin(agencyData._id, agentId);
        setAgencyData(prev => ({
          ...prev,
          admins: [...(prev.admins || []), agentId]
        }));
        alert(t('messages.adminAdded', { name: agentName }));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : t('messages.onlyOwnerCanManage'));
    }
  };

  const handleRemoveAgent = async (agentId: string, agentName: string) => {
    if (!isAdmin) {
      alert(t('messages.onlyAdminCanRemove'));
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

      // Update local state to remove the agent
      setAgents(prevAgents => prevAgents.filter(agent =>
        (agent.id || agent._id) !== agentId
      ));

      // Update agency data
      setAgencyData(prev => ({
        ...prev,
        totalAgents: prev.totalAgents - 1
      }));

      alert(t('messages.agentRemoved', { name: agentName }));
    } catch (error: any) {
      console.error('Error removing agent:', error);
      alert(error.message || t('messages.onlyAdminCanRemove'));
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

      // Update current user in app context
      if (dispatch && currentUser) {
        // Cast to any to avoid TypeScript error when the action type is not declared in the reducer's Action union.
        // Prefer updating the reducer's Action type to include 'SET_USER' if you want a stricter fix.
        dispatch({
          type: 'SET_USER',
          payload: {
            ...currentUser,
            agencyId: undefined,
            agencyName: undefined,
          }
        } as any);
      }

      alert(response.message || t('messages.leftAgency', { agency: agencyData.name }));

      // Redirect to home or agencies page
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error leaving agency:', error);
      alert(error.message || t('messages.leftAgency', { agency: agencyData.name }));
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

  const handleSaveAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('balkan_estate_token');

      // Filter out empty strings from arrays before submitting
      const sanitizedForm = {
        ...editForm,
        specialties: editForm.specialties.filter(s => s),
        specializations: editForm.specializations.filter(s => s),
        serviceAreas: editForm.serviceAreas.filter(s => s),
        certifications: editForm.certifications.filter(s => s),
        languages: editForm.languages.filter(s => s),
      };

      const response = await fetch(`${API_URL}/agencies/${agencyData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(sanitizedForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update agency');
      }

      const data = await response.json();
      setAgencyData(data.agency);
      setIsEditModalOpen(false);
      alert(t('messages.agencyUpdated'));
    } catch (error) {
      console.error('Error updating agency:', error);
      alert(error instanceof Error ? error.message : t('messages.agencyUpdated'));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(t('messages.selectImageFile'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('messages.imageSizeLimit'));
      return;
    }

    setIsUploadingLogo(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(`${API_URL}/agencies/${agencyData._id}/upload-logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('balkan_estate_token')}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('messages.logoUpdated'));
      }

      setAgencyData(data.agency);
      alert(t('messages.logoUpdated'));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('messages.logoUpdated'));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(t('messages.selectImageFile'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('messages.imageSizeLimit'));
      return;
    }

    setIsUploadingCover(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('cover', file);

      const response = await fetch(`${API_URL}/agencies/${agencyData._id}/upload-cover`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('balkan_estate_token')}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('messages.coverUpdated'));
      }

      setAgencyData(data.agency);
      alert(t('messages.coverUpdated'));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('messages.coverUpdated'));
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleGradientSelect = async (gradientId: string) => {
    if (!isOwner) return;

    try {
      const gradient = GRADIENT_PRESETS.find(g => g.id === gradientId);
      if (!gradient) return;

      const response = await fetch(`${API_URL}/agencies/${agencyData._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('balkan_estate_token')}`,
        },
        body: JSON.stringify({
          coverGradient: gradient.gradient,
          coverImage: '', // Clear cover image when selecting gradient
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t('messages.gradientUpdated'));
      }

      setAgencyData(data.agency);
      setShowGradientPicker(false);
      alert(t('messages.gradientUpdated'));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('messages.gradientUpdated'));
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return { emoji: '🥇', color: 'from-yellow-400 to-yellow-600', text: t('teamMembers.topAgent') };
    if (index === 1) return { emoji: '🥈', color: 'from-gray-300 to-gray-500', text: t('teamMembers.secondPlace') };
    if (index === 2) return { emoji: '🥉', color: 'from-orange-400 to-orange-600', text: t('teamMembers.thirdPlace') };
    return null;
  };

  const handleSubscriptionSuccess = () => {
    // Refresh agency data to get updated featured status
    fetchAgencyData();
    // Force re-render of subscription card
    setSubscriptionKey((prev) => prev + 1);
  };

  // Scroll to top when property view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [propertyView]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white overflow-y-auto">
      {/* SEO Meta Tags */}
      <SEO
        title={`${agencyData.name} - Real Estate Agency`}
        description={agencyData.description || `${agencyData.name} is a trusted real estate agency in ${agencyData.city || 'the Balkans'}. Browse ${agencyData.totalProperties || 0} listings and connect with ${agencyData.totalAgents || 0} professional agents.`}
        canonical={`${typeof window !== 'undefined' ? window.location.origin : ''}/agencies/${agency.slug}`}
        image={agencyData.logo || agencyData.coverImage}
        type="website"
        agency={{
          name: agencyData.name,
          logo: agencyData.logo,
          description: agencyData.description,
          address: agencyData.address,
          phone: agencyData.phone,
          email: agencyData.email,
        }}
      />

      {/* Hero Banner - Professional Design */}
      <div className="relative h-[28rem] md:h-[32rem] overflow-hidden flex-shrink-0">
        {/* Background Layer */}
        {agencyData.coverImage ? (
          <>
            <img
              src={agencyData.coverImage}
              alt={agencyData.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/90" />
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${(agencyData as any).coverGradient || 'from-slate-800 via-slate-900 to-slate-950'}`} />
        )}

        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

        {/* Top Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 px-4 md:px-6 py-4">
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

              {/* Breadcrumbs - Below back button */}
              <div className="ml-1">
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

            {/* Right Side - Cover Controls (For owners and admins) */}
            {isAdmin && (
              <div className="relative flex gap-2">
                {/* Gradient Picker Button */}
                <button
                  onClick={() => setShowGradientPicker(!showGradientPicker)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-md text-white text-sm font-medium rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  <span className="hidden sm:inline">{t('banner.gradients')}</span>
                </button>

                {/* Upload Image Button */}
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
                  className={`inline-flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-md text-white text-sm font-medium rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer ${
                    isUploadingCover ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isUploadingCover ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                      <span className="hidden sm:inline">{t('banner.uploading')}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden sm:inline">{t('banner.uploadImage')}</span>
                    </>
                  )}
                </label>

                {/* Gradient Picker Dropdown */}
                {showGradientPicker && (
                  <div className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 w-80 max-h-96 overflow-y-auto border border-slate-200 z-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">{t('banner.chooseGradient')}</h3>
                      <button
                        onClick={() => setShowGradientPicker(false)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {GRADIENT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleGradientSelect(preset.id)}
                          className="group relative h-20 rounded-xl overflow-hidden border-2 border-slate-200 hover:border-primary transition-all duration-300 hover:scale-[1.02]"
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${preset.gradient}`} />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-white font-medium text-xs drop-shadow-lg">
                              {preset.name}
                            </span>
                          </div>
                          {(agencyData as any).coverGradient === preset.gradient && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
                              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-3 text-center">
                      {t('banner.customImageHint')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Agency Identity - Centered Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          {/* Logo Container */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-500"></div>
            {agencyData.logo ? (
              <img
                src={agencyData.logo}
                alt={agencyData.name}
                className="relative w-28 h-28 md:w-32 md:h-32 rounded-2xl border-2 border-white/30 shadow-2xl object-cover backdrop-blur-sm"
              />
            ) : (
              <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-2xl border-2 border-white/30 shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                <BuildingOfficeIcon className="w-14 h-14 text-white" />
              </div>
            )}

            {/* Featured Badge */}
            {agencyData.isFeatured && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2.5 py-1 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-1">
                <StarIcon className="w-3 h-3 fill-current" />
                {t('common.featured')}
              </div>
            )}

            {/* Logo Upload Button */}
            {isOwner && (
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                  className="hidden"
                />
                <label
                  htmlFor="logo-upload"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 font-medium rounded-lg shadow-lg hover:bg-slate-50 transition-all duration-300 cursor-pointer text-xs ${
                    isUploadingLogo ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isUploadingLogo ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-300 border-t-primary"></div>
                      {t('banner.uploading')}
                    </>
                  ) : (
                    t('banner.changeLogo')
                  )}
                </label>
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

          {/* Quick Stats Row */}
          <div className="mt-6 flex items-center gap-6 md:gap-8">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-white">{agencyProperties.length}</p>
              <p className="text-xs md:text-sm text-white/60 font-medium uppercase tracking-wider">Listings</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-white">{agencyData.totalAgents}</p>
              <p className="text-xs md:text-sm text-white/60 font-medium uppercase tracking-wider">Agents</p>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <StarIcon className="w-5 h-5 text-amber-400 fill-current" />
                <p className="text-2xl md:text-3xl font-bold text-white">4.8</p>
              </div>
              <p className="text-xs md:text-sm text-white/60 font-medium uppercase tracking-wider">Rating</p>
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
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 via-blue-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/4"></div>

            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/25">
                  <ChartBarIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{t('salesPerformance.title')}</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">{t('salesPerformance.salesLast12Months')}</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900">{salesLast12Months}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">{t('salesPerformance.totalSales')}</p>
                  <p className="text-2xl md:text-3xl font-bold text-green-600">{totalSales}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-100">
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
                <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">{t('salesPerformance.averagePrice')}</p>
                  <p className="text-lg md:text-xl font-bold text-primary">
                    {averagePrice > 0 ? formatPrice(averagePrice, agencyData.country || 'Serbia') : t('stats.notAvailable')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* About Section - Clean Two-Column Layout */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 md:p-8 mb-8 border border-slate-100">
          {/* Section Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">About {agencyData.name}</h2>
              {agencyData.yearsInBusiness && (
                <p className="text-sm text-slate-500">{agencyData.yearsInBusiness}+ years of excellence in real estate</p>
              )}
            </div>
          </div>

          {agencyData.description && (
            <p className="text-slate-600 leading-relaxed mb-8 text-base">{agencyData.description}</p>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Contact */}
            <div className="space-y-6">
              {/* Contact Card */}
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Contact Information</h3>
                <div className="space-y-4">
                  <a href={`tel:${agencyData.phone}`} className="flex items-center gap-3 text-slate-600 hover:text-primary transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <PhoneIcon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-sm">{agencyData.phone}</span>
                  </a>
                  <a href={`mailto:${agencyData.email}`} className="flex items-center gap-3 text-slate-600 hover:text-primary transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <EnvelopeIcon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-sm">{agencyData.email}</span>
                  </a>
                  {agencyData.address && (
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPinIcon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{agencyData.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Areas */}
              {agencyData.serviceAreas && agencyData.serviceAreas.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Service Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {agencyData.serviceAreas.map((area, index) => (
                      <span key={index} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-100">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Expertise */}
            <div className="space-y-6">
              {/* Specialties */}
              {agencyData.specialties && agencyData.specialties.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {agencyData.specialties.map((specialty, index) => (
                      <span key={index} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Specializations */}
              {agencyData.specializations && agencyData.specializations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Specializations</h3>
                  <div className="flex flex-wrap gap-2">
                    {agencyData.specializations.map((spec, index) => (
                      <span key={index} className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-xs font-medium border border-violet-100">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {agencyData.languages && agencyData.languages.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {agencyData.languages.map((lang, index) => (
                      <span key={index} className="px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-xs font-medium border border-sky-100">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin Section - Invitation Code */}
          {isAdmin && agencyData.invitationCode && (
            <div className="mt-8 p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 flex-shrink-0">
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-1">Agency Invitation Code</h4>
                  <p className="text-sm text-slate-600 mb-3">Share this code with agents you want to join your agency</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <code className="px-4 py-2.5 bg-white border border-amber-200 rounded-lg font-mono text-base font-bold text-slate-900 tracking-widest shadow-sm">
                      {agencyData.invitationCode}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(agencyData.invitationCode || '');
                        alert('Invitation code copied to clipboard!');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-all duration-300 shadow-md shadow-amber-500/25"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-3">
            {isAdmin && (
              <>
                <button
                  onClick={handleOpenEditModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all duration-300 shadow-lg shadow-slate-900/25"
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit Agency
                </button>
                <button
                  onClick={() => setIsJoinRequestsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/25"
                >
                  <BellIcon className="w-4 h-4" />
                  Manage Join Requests
                </button>
              </>
            )}

            {canRequestToJoin && (
              <button
                onClick={handleRequestToJoin}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all duration-300 shadow-lg shadow-emerald-600/25"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Request to Join Agency
              </button>
            )}
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
                    <h2 className="text-xl font-bold text-slate-900">Featured Subscription</h2>
                    <p className="text-xs text-slate-500">Boost your visibility</p>
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
                  <span className="font-semibold text-violet-700">Pro Tip:</span> Featured agencies get up to 5x more visibility and appear at the top of search results!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Team Members Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/25">
                <UsersIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Team Members</h2>
                <p className="text-xs text-slate-500">{agents.length} agents • Ranked by performance</p>
              </div>
            </div>
            <button
              onClick={() => setShowAllMembers(!showAllMembers)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <TrophyIcon className="w-4 h-4 text-amber-500" />
              {showAllMembers ? 'Show Top Performers' : 'Show All Members'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/30 border-t-primary"></div>
                <p className="text-sm text-slate-500">Loading team members...</p>
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
                    className="group relative bg-white rounded-xl shadow-md shadow-slate-200/50 border border-slate-100 p-5 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer hover:border-slate-200"
                  >
                    {/* Rank Badge */}
                    {rank && (
                      <div className={`absolute -top-2.5 -right-2.5 bg-gradient-to-r ${rank.color} text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5`}>
                        <span className="text-sm">{rank.emoji}</span>
                        <span>{rank.text}</span>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Agent Photo */}
                      <div className="relative flex-shrink-0">
                        {agent.avatarUrl ? (
                          <img
                            src={agent.avatarUrl}
                            alt={agent.name}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-200 group-hover:border-slate-300 transition-colors"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border border-slate-200">
                            <UserCircleIcon className="w-9 h-9 text-slate-400" />
                          </div>
                        )}
                        {agent.stats?.rating && agent.stats.rating >= 4.5 && (
                          <div className="absolute -bottom-1.5 -right-1.5 bg-amber-500 text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow flex items-center gap-0.5">
                            <StarIcon className="w-2.5 h-2.5 fill-current" />
                            {agent.stats.rating.toFixed(1)}
                          </div>
                        )}
                      </div>

                      {/* Agent Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-base font-bold text-slate-900 truncate">{agent.name}</h3>
                          {isAgentOwner && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-[10px] font-bold rounded-md flex items-center gap-0.5">
                              <ShieldCheckIcon className="w-2.5 h-2.5" />
                              Owner
                            </span>
                          )}
                          {isAgentAdmin && !isAgentOwner && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[10px] font-bold rounded-md flex items-center gap-0.5">
                              <ShieldCheckIcon className="w-2.5 h-2.5" />
                              Admin
                            </span>
                          )}
                        </div>
                        {agent.licenseNumber && (
                          <p className="text-xs text-slate-400 mb-3">License: {agent.licenseNumber}</p>
                        )}

                        {/* Performance Stats */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-slate-50 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-slate-400 font-medium uppercase">Sales Value</p>
                            <p className="text-sm font-bold text-slate-700">
                              {formatPrice(agent.stats?.totalSalesValue || 0, agency.country || 'Serbia').replace(/\.\d+/, '')}
                            </p>
                          </div>
                          <div className="bg-emerald-50 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-slate-400 font-medium uppercase">Sold</p>
                            <p className="text-sm font-bold text-emerald-600">{agent.stats?.propertiesSold || 0}</p>
                          </div>
                          <div className="bg-sky-50 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-slate-400 font-medium uppercase">Active</p>
                            <p className="text-sm font-bold text-sky-600">{agent.stats?.activeListings || 0}</p>
                          </div>
                        </div>

                        {/* Contact and Actions */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {agent.phone && (
                            <a
                              href={`tel:${agent.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary transition-colors"
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
                                {isAgentAdmin ? 'Remove Admin' : 'Make Admin'}
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
                                    Removing...
                                  </>
                                ) : (
                                  <>
                                    <XMarkIcon className="w-3 h-3" />
                                    Remove
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
                                    Leaving...
                                  </>
                                ) : (
                                  <>
                                    <XMarkIcon className="w-3 h-3" />
                                    Leave Agency
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
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
              <p className="text-slate-500 font-medium">No agents found for this agency</p>
              <p className="text-sm text-slate-400 mt-1">Team members will appear here once they join</p>
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
                <h2 className="text-xl font-bold text-slate-900">Properties Map</h2>
                <p className="text-xs text-slate-500">
                  ({agencyProperties.filter(p => p.status === 'active').length} active, {agencyProperties.filter(p => p.status === 'sold').length} sold)
                </p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
              <MapContainer
                center={agencyProperties.filter(p => p.lat && p.lng)[0] ? [agencyProperties.filter(p => p.lat && p.lng)[0].lat!, agencyProperties.filter(p => p.lat && p.lng)[0].lng!] : [agencyData.lat || 42.0, agencyData.lng || 21.0]}
                zoom={12}
                scrollWheelZoom={true}
                className="w-full h-[400px] md:h-[500px]"
                maxZoom={18}
                minZoom={3}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapInvalidator />
                {agencyProperties.filter(p => p.lat && p.lng).map((property) => (
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
                          <img src={property.imageUrl} alt={property.address} className="w-full h-32 object-cover rounded-lg mb-2" />
                        )}
                        <p className="font-semibold text-sm mb-1 text-slate-900 line-clamp-2">{property.address}</p>
                        <p className="text-xs text-slate-500 mb-2">{property.city}, {property.country}</p>
                        <p className="font-bold text-emerald-600 mb-2">{formatPrice(property.price, property.country)}</p>
                        <div className="flex gap-2 text-xs text-slate-600 mb-3">
                          <span>{property.beds} beds</span>
                          <span>•</span>
                          <span>{property.baths} baths</span>
                          <span>•</span>
                          <span>{property.sqft} m²</span>
                        </div>
                        <button
                          onClick={() => {
                            dispatch({ type: 'SET_SELECTED_PROPERTY', payload: property });
                            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'propertyDetail' });
                          }}
                          className={`w-full text-white px-3 py-2 rounded-lg font-semibold text-sm ${property.status === 'sold' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        >
                          View Details
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
                <span className="text-slate-600">For Sale ({agencyProperties.filter(p => p.status === 'active').length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-slate-600">Sold ({agencyProperties.filter(p => p.status === 'sold').length})</span>
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
                <h2 className="text-xl font-bold text-slate-900">Service Area Location</h2>
                <p className="text-xs text-slate-500">{agencyData.city}, {agencyData.country}</p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
              <MapContainer
                center={[agencyData.lat, agencyData.lng]}
                zoom={13}
                scrollWheelZoom={true}
                className="w-full h-80"
                maxZoom={18}
                minZoom={3}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                        <img src={agencyData.logo} alt={agencyData.name} className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-2 border-slate-300" />
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
                <h2 className="text-xl font-bold text-slate-900">Property Portfolio</h2>
                <p className="text-xs text-slate-500">{agencyProperties.length} total properties</p>
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
                Active
                <span className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-md ${
                  propertyView === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {agencyProperties.filter(p => p.status === 'active').length}
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
                Sold
                <span className={`ml-1 px-2 py-0.5 text-xs font-bold rounded-md ${
                  propertyView === 'sold' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {agencyProperties.filter(p => p.status === 'sold').length}
                </span>
              </button>
            </div>
          </div>

          {/* Properties Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => <PropertyCardSkeleton key={i} />)}
            </div>
          ) : agencyProperties.filter(p => p.status === propertyView).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {agencyProperties.filter(p => p.status === propertyView).map(property => (
                <PropertyCard key={property.id || property._id} property={property} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HomeIcon className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">
                {propertyView === 'active' ? 'No active listings at the moment' : 'No sold properties yet'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {propertyView === 'active' ? 'New listings will appear here' : 'Sold properties will be shown here'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Join Requests Modal */}
      <AgencyJoinRequestsModal
        isOpen={isJoinRequestsModalOpen}
        onClose={() => setIsJoinRequestsModalOpen(false)}
        agencyId={agency._id}
        agencyName={agency.name}
      />

      {/* Invitation Code Modal */}
      <InvitationCodeModal
        isOpen={isInvitationCodeModalOpen}
        onClose={() => setIsInvitationCodeModalOpen(false)}
        onSubmit={handleSubmitInvitationCode}
        agencyName={agency.name}
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
                  <h3 className="text-lg font-bold text-slate-900">Edit Agency</h3>
                  <p className="text-xs text-slate-500">Update your agency information</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAgency} className="p-6 space-y-8 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Basic Information
                </h4>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Agency Name *
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
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm resize-none"
                    rows={4}
                    placeholder="Tell clients about your agency..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Email *
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
                      Phone *
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
                      Website
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
                      Years in Business
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
                  Location
                </h4>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Address
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
                      City
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
                      Country
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
                      Zip Code
                    </label>
                    <input
                      type="text"
                      value={editForm.zipCode}
                      onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.lat}
                      onChange={(e) => setEditForm({ ...editForm, lat: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                      placeholder="e.g., 42.6629"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.lng}
                      onChange={(e) => setEditForm({ ...editForm, lng: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                      placeholder="e.g., 21.1655"
                    />
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                  Social Media
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Facebook URL
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
                      Instagram URL
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
                      LinkedIn URL
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
                      Twitter URL
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
                  Specialties & Certifications
                </h4>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Specialties (comma-separated)
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
                    Certifications (comma-separated)
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
                    Languages Spoken (comma-separated)
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
                  <p className="text-xs text-slate-400 mt-1.5">Languages are auto-synced when agents join/leave</p>
                </div>
              </div>

              {/* Business Hours */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Business Hours
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
            </form>

            {/* Action Buttons - Fixed Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-white font-medium transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="editAgencyForm"
                onClick={handleSaveAgency}
                className="flex-1 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium transition-colors text-sm shadow-lg shadow-primary/25"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyDetailPage;

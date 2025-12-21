import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, StarIcon, ArrowLeftIcon, UserCircleIcon, BellIcon, TrophyIcon, ChartBarIcon, HomeIcon, UsersIcon, XMarkIcon, ShieldCheckIcon, PencilIcon } from '../constants';
import PropertyCard from './BuyerFlow/PropertyDisplay/PropertyCard';
import PropertyCardSkeleton from './BuyerFlow/PropertyDisplay/PropertyCardSkeleton';
import AgencyJoinRequestsModal from './AgencyJoinRequestsModal';
import InvitationCodeModal from './InvitationCodeModal';
import FeaturedSubscriptionCard from './shared/FeaturedSubscriptionCard';
import FeaturedSubscriptionDialog from './shared/FeaturedSubscriptionDialog';
import { formatPrice } from '../utils/currency';
import { createJoinRequest, removeAgentFromAgency, addAgencyAdmin, removeAgencyAdmin, verifyInvitationCode, leaveAgency } from '../services/apiService';
import { Agency } from '../types';
import { socketService } from '../services/socketService';

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
}

interface AgencyDetailPageProps {
  agency: Agency;
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
  const { state, dispatch } = useAppContext();
  const { currentUser, isAuthenticated } = state;
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
      alert('Only the agency owner can manage admins');
      return;
    }

    const action = isCurrentlyAdmin ? 'remove admin rights from' : 'make admin';
    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${agentName}?`
    );

    if (!confirmed) return;

    try {
      if (isCurrentlyAdmin) {
        await removeAgencyAdmin(agencyData._id, agentId);
        setAgencyData(prev => ({
          ...prev,
          admins: prev.admins?.filter(id => id !== agentId) || []
        }));
        alert(`${agentName} is no longer an admin.`);
      } else {
        await addAgencyAdmin(agencyData._id, agentId);
        setAgencyData(prev => ({
          ...prev,
          admins: [...(prev.admins || []), agentId]
        }));
        alert(`${agentName} is now an admin!`);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update admin status');
    }
  };

  const handleRemoveAgent = async (agentId: string, agentName: string) => {
    if (!isAdmin) {
      alert('Only agency admins can remove agents');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove ${agentName} from ${agencyData.name}?\n\n` +
      `This will:\n` +
      `- Remove them from your agency\n` +
      `- Clear their agency affiliation\n` +
      `- Keep their properties and reviews intact`
    );

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

      alert(`${agentName} has been removed from the agency successfully.`);
    } catch (error: any) {
      console.error('Error removing agent:', error);
      alert(error.message || 'Failed to remove agent from agency');
    } finally {
      setRemovingAgentId(null);
    }
  };

  const handleLeaveAgency = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to leave ${agencyData.name}?\n\n` +
      `This will:\n` +
      `- Remove you from this agency\n` +
      `- Clear your agency affiliation\n` +
      `- Keep your properties and reviews intact\n` +
      `- Change your status to Independent Agent`
    );

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

      alert(response.message || `You have successfully left ${agencyData.name}`);

      // Redirect to home or agencies page
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error leaving agency:', error);
      alert(error.message || 'Failed to leave agency');
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
      alert('Agency updated successfully!');
    } catch (error) {
      console.error('Error updating agency:', error);
      alert(error instanceof Error ? error.message : 'Failed to update agency');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
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
        throw new Error(data.message || 'Failed to upload logo');
      }

      setAgencyData(data.agency);
      alert('Logo updated successfully!');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
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
        throw new Error(data.message || 'Failed to upload cover image');
      }

      setAgencyData(data.agency);
      alert('Cover image updated successfully!');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload cover image');
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
        throw new Error(data.message || 'Failed to update gradient');
      }

      setAgencyData(data.agency);
      setShowGradientPicker(false);
      alert('Banner gradient updated successfully!');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to update gradient');
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return { emoji: '🥇', color: 'from-yellow-400 to-yellow-600', text: 'Top Agent' };
    if (index === 1) return { emoji: '🥈', color: 'from-gray-300 to-gray-500', text: '2nd Place' };
    if (index === 2) return { emoji: '🥉', color: 'from-orange-400 to-orange-600', text: '3rd Place' };
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
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      {/* Hero Banner with Cover Image - Larger for agency branding */}
      <div className="relative h-[32rem] md:h-[36rem] bg-gradient-to-br from-primary to-primary-dark overflow-hidden flex-shrink-0">
        {agencyData.coverImage ? (
          <>
            <img
              src={agencyData.coverImage}
              alt={agencyData.name}
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${(agencyData as any).coverGradient || 'from-primary via-primary-dark to-black/80'}`} />
        )}

        {/* Cover Controls - Only for owners */}
        {isOwner && (
          <div className="absolute top-6 right-6 z-10 flex gap-3">
            {/* Gradient Picker Button */}
            <button
              onClick={() => setShowGradientPicker(!showGradientPicker)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-sm text-white font-semibold rounded-lg hover:bg-black/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Gradients
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
              className={`inline-flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-sm text-white font-semibold rounded-lg hover:bg-black/50 transition-colors cursor-pointer ${
                isUploadingCover ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUploadingCover ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload Image
                </>
              )}
            </label>

            {/* Gradient Picker Dropdown */}
            {showGradientPicker && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl p-4 w-80 max-h-96 overflow-y-auto border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Choose Gradient</h3>
                  <button
                    onClick={() => setShowGradientPicker(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleGradientSelect(preset.id)}
                      className="group relative h-24 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-primary transition-all hover:scale-105"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${preset.gradient}`} />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-sm drop-shadow-lg">
                          {preset.name}
                        </span>
                      </div>
                      {(agencyData as any).coverGradient === preset.gradient && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Or upload a custom image using the button above
                </p>
              </div>
            )}
          </div>
        )}

        {/* Back Button - positioned to avoid sidebar on desktop */}
        <button
          onClick={handleBack}
          className="absolute top-6 left-6 md:left-24 flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-lg bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors z-10"
          aria-label="Go back to agencies list"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back
        </button>

        {/* Agency Logo and Name */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <div className="relative group">
            {agencyData.logo ? (
              <img
                src={agencyData.logo}
                alt={agencyData.name}
                className="w-40 h-40 rounded-3xl border-4 border-white shadow-2xl object-cover"
              />
            ) : (
              <div className="w-40 h-40 rounded-3xl border-4 border-white shadow-2xl bg-white flex items-center justify-center">
                <BuildingOfficeIcon className="w-20 h-20 text-primary" />
              </div>
            )}
            {agencyData.isFeatured && (
              <div className="absolute -top-2 -right-2 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                <StarIcon className="w-4 h-4" />
                Featured
              </div>
            )}

            {/* Logo Upload Button - Only for owners */}
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
                  className={`inline-flex items-center gap-2 px-3 py-1.5 bg-white text-primary font-semibold rounded-full shadow-lg hover:bg-gray-100 transition-colors cursor-pointer text-sm ${
                    isUploadingLogo ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isUploadingLogo ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                      Uploading...
                    </>
                  ) : (
                    'Change Logo'
                  )}
                </label>
              </div>
            )}
          </div>

          <h1 className="mt-6 text-4xl md:text-5xl font-bold text-white text-center drop-shadow-lg">
            {agencyData.name}
          </h1>

          <div className="mt-4 flex items-center gap-2 text-white/90 text-lg">
            <MapPinIcon className="w-5 h-5" />
            <span>{agencyData.city}, {agencyData.country}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10 pb-16">
        {/* Upload Error Message */}
        {uploadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            <p className="text-sm font-medium">{uploadError}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Listings</p>
                <p className="text-3xl font-bold text-primary mt-1">{agencyProperties.length}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <HomeIcon className="w-7 h-7 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Agents</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{agencyData.totalAgents}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <UsersIcon className="w-7 h-7 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Years in Business</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{agencyData.yearsInBusiness || 'N/A'}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <ChartBarIcon className="w-7 h-7 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Rating</p>
                <div className="flex items-center gap-1 mt-1">
                  <StarIcon className="w-6 h-6 text-amber-500 fill-current" />
                  <p className="text-3xl font-bold text-gray-900">4.8</p>
                </div>
              </div>
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <TrophyIcon className="w-7 h-7 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Sales Statistics */}
        {soldProperties.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sales Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-2">Sales last 12 months</p>
                <p className="text-3xl font-bold text-primary">{salesLast12Months}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-2">Total sales</p>
                <p className="text-3xl font-bold text-green-600">{totalSales}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-2">Price range</p>
                <p className="text-lg font-bold text-blue-600">
                  {minPrice > 0 && maxPrice > 0 ? (
                    <>
                      {formatPrice(minPrice, agencyData.country || 'Serbia')} - {formatPrice(maxPrice, agencyData.country || 'Serbia')}
                    </>
                  ) : (
                    'N/A'
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-2">Average price</p>
                <p className="text-2xl font-bold text-purple-600">
                  {averagePrice > 0 ? formatPrice(averagePrice, agencyData.country || 'Serbia') : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* About Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About {agencyData.name}</h2>
          {agencyData.description && (
            <p className="text-gray-600 text-lg leading-relaxed mb-6">{agencyData.description}</p>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-3">
                <a href={`tel:${agencyData.phone}`} className="flex items-center gap-3 text-gray-600 hover:text-primary transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <PhoneIcon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">{agencyData.phone}</span>
                </a>
                <a href={`mailto:${agencyData.email}`} className="flex items-center gap-3 text-gray-600 hover:text-primary transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <EnvelopeIcon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">{agencyData.email}</span>
                </a>
                {agencyData.address && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPinIcon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium">{agencyData.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Specialties */}
            {agencyData.specialties && agencyData.specialties.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {agencyData.specialties.map((specialty, index) => (
                    <span key={index} className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Specializations */}
            {agencyData.specializations && agencyData.specializations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {agencyData.specializations.map((spec, index) => (
                    <span key={index} className="px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-medium border border-purple-200">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Service Areas */}
            {agencyData.serviceAreas && agencyData.serviceAreas.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {agencyData.serviceAreas.map((area, index) => (
                    <span key={index} className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages Spoken */}
            {agencyData.languages && agencyData.languages.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Languages Spoken</h3>
                <div className="flex flex-wrap gap-2">
                  {agencyData.languages.map((lang, index) => (
                    <span key={index} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Admin Section - Invitation Code */}
          {isAdmin && agencyData.invitationCode && (
            <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Agency Invitation Code</h4>
                  <p className="text-sm text-gray-600 mb-2">Share this code with agents you want to join your agency</p>
                  <div className="flex items-center gap-2">
                    <code className="px-4 py-2 bg-white border border-amber-300 rounded-lg font-mono text-lg font-semibold text-primary tracking-wider">
                      {agencyData.invitationCode}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(agencyData.invitationCode || '');
                        alert('Invitation code copied to clipboard!');
                      }}
                      className="px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            {isAdmin && (
              <>
                <button
                  onClick={handleOpenEditModal}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <PencilIcon className="w-5 h-5" />
                  Edit Agency
                </button>
                <button
                  onClick={() => setIsJoinRequestsModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <BellIcon className="w-5 h-5" />
                  Manage Join Requests
                </button>
              </>
            )}

            {canRequestToJoin && (
              <button
                onClick={handleRequestToJoin}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Request to Join Agency
              </button>
            )}
          </div>
        </div>

        {/* Featured Subscription Section - Only visible to agency owner */}
        {isOwner && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Featured Subscription</h2>
              <span className="text-sm text-gray-500">Boost Your Visibility</span>
            </div>

            <FeaturedSubscriptionCard
              key={subscriptionKey}
              agencyId={agencyData._id}
              onUpgrade={() => setIsFeaturedSubscriptionDialogOpen(true)}
            />

            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-700">
                <strong>💡 Pro Tip:</strong> Featured agencies get up to 5x more visibility and appear at the top of search results!
              </p>
            </div>
          </div>
        )}

        {/* Team Members Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Team Members</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAllMembers(!showAllMembers)}
                className="px-4 py-2 text-sm font-medium text-primary border-2 border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                {showAllMembers ? 'Show Top Performers' : 'Show All Members'}
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <TrophyIcon className="w-5 h-5" />
                <span>Ranked by Performance</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : rankedAgents.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    className="relative bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                  >
                    {/* Rank Badge */}
                    {rank && (
                      <div className={`absolute -top-3 -right-3 bg-gradient-to-r ${rank.color} text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2`}>
                        <span className="text-lg">{rank.emoji}</span>
                        <span>{rank.text}</span>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Agent Photo */}
                      <div className="relative">
                        {agent.avatarUrl ? (
                          <img
                            src={agent.avatarUrl}
                            alt={agent.name}
                            className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center border-2 border-gray-200">
                            <UserCircleIcon className="w-12 h-12 text-white" />
                          </div>
                        )}
                        {agent.stats?.rating && agent.stats.rating >= 4.5 && (
                          <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white px-2 py-1 rounded-lg text-xs font-bold shadow">
                            <StarIcon className="w-3 h-3 inline fill-current" />
                            {agent.stats.rating.toFixed(1)}
                          </div>
                        )}
                      </div>

                      {/* Agent Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-bold text-gray-900">{agent.name}</h3>
                          {isAgentOwner && (
                            <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-purple-700 text-white text-xs font-bold rounded-full flex items-center gap-1">
                              <ShieldCheckIcon className="w-3 h-3" />
                              Owner
                            </span>
                          )}
                          {isAgentAdmin && !isAgentOwner && (
                            <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-700 text-white text-xs font-bold rounded-full flex items-center gap-1">
                              <ShieldCheckIcon className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                        </div>
                        {agent.licenseNumber && (
                          <p className="text-sm text-gray-500">License: {agent.licenseNumber}</p>
                        )}

                        {/* Performance Stats */}
                        <div className="mt-4 grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Total Sales</p>
                            <p className="text-lg font-bold text-primary">
                              {formatPrice(agent.stats?.totalSalesValue || 0, agency.country || 'Serbia')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Properties Sold</p>
                            <p className="text-lg font-bold text-green-600">{agent.stats?.propertiesSold || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Active Listings</p>
                            <p className="text-lg font-bold text-blue-600">{agent.stats?.activeListings || 0}</p>
                          </div>
                        </div>

                        {/* Contact and Actions */}
                        <div className="mt-3 flex flex-col gap-2">
                          {agent.phone && (
                            <a
                              href={`tel:${agent.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <PhoneIcon className="w-4 h-4" />
                              {agent.phone}
                            </a>
                          )}

                          {/* Admin Actions - Only visible to owner */}
                          {isOwner && !isAgentOwner && (
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleAdmin(agentId, agent.name, isAgentAdmin || false);
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                  isAgentAdmin
                                    ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                                    : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                }`}
                                title={isAgentAdmin ? 'Remove admin rights' : 'Make admin'}
                              >
                                <ShieldCheckIcon className="w-4 h-4" />
                                {isAgentAdmin ? 'Remove Admin' : 'Make Admin'}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAgent(agentId, agent.name);
                                }}
                                disabled={removingAgentId === agentId}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
                                title="Remove agent from agency"
                              >
                                {removingAgentId === agentId ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                    Removing...
                                  </>
                                ) : (
                                  <>
                                    <XMarkIcon className="w-4 h-4" />
                                    Remove
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Leave Agency Button - Only visible to current user who is not the owner */}
                          {!isOwner && currentUser && agentId && (String(agentId) === String(currentUser.id) || String(agentId) === String(currentUser._id)) && !isAgentOwner && (
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLeaveAgency();
                                }}
                                disabled={isLeavingAgency}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
                                title="Leave this agency"
                              >
                                {isLeavingAgency ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                    Leaving...
                                  </>
                                ) : (
                                  <>
                                    <XMarkIcon className="w-4 h-4" />
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
            <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center">
              <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No agents found for this agency</p>
            </div>
          )}
        </div>

        {/* Agency Stats Cards */}
        <div className="mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div
                className={`text-center p-6 rounded-lg cursor-pointer transition-all ${
                  propertyView === 'active' ? 'bg-primary text-white shadow-lg' : 'bg-white hover:bg-neutral-50 border border-neutral-200'
                }`}
                onClick={() => setPropertyView('active')}
              >
                <p className={`text-sm font-semibold mb-2 ${propertyView === 'active' ? 'text-white' : 'text-neutral-600'}`}>
                  ACTIVE LISTINGS
                </p>
                <p className={`text-3xl font-bold ${propertyView === 'active' ? 'text-white' : 'text-neutral-900'}`}>
                  {agencyProperties.filter(p => p.status === 'active').length}
                </p>
              </div>
              <div
                className={`text-center p-6 rounded-lg cursor-pointer transition-all ${
                  propertyView === 'sold' ? 'bg-primary text-white shadow-lg' : 'bg-white hover:bg-neutral-50 border border-neutral-200'
                }`}
                onClick={() => setPropertyView('sold')}
              >
                <p className={`text-sm font-semibold mb-2 ${propertyView === 'sold' ? 'text-white' : 'text-neutral-600'}`}>
                  SOLD PROPERTIES
                </p>
                <p className={`text-3xl font-bold ${propertyView === 'sold' ? 'text-white' : 'text-neutral-900'}`}>
                  {agencyProperties.filter(p => p.status === 'sold').length}
                </p>
              </div>
            </div>
        </div>

        {/* Properties Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">
              {propertyView === 'active' ? 'Active Listings' : 'Sold Properties'}
            </h2>
            <span className="text-sm text-gray-500">
              {agencyProperties.filter(p => p.status === propertyView).length} properties
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <PropertyCardSkeleton key={i} />)}
            </div>
          ) : agencyProperties.filter(p => p.status === propertyView).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agencyProperties.filter(p => p.status === propertyView).map(property => (
                <PropertyCard key={property.id || property._id} property={property} />
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center">
              <HomeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">
                {propertyView === 'active' ? 'No active listings at the moment' : 'No sold properties yet'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {propertyView === 'active' ? 'Check back soon for new properties' : 'Sold properties will appear here'}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-2xl font-bold text-gray-900">Edit Agency</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveAgency} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Basic Information</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agency Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years in Business
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.yearsInBusiness}
                    onChange={(e) => setEditForm({ ...editForm, yearsInBusiness: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4 border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-900">Location</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={editForm.country}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      value={editForm.zipCode}
                      onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.lat}
                      onChange={(e) => setEditForm({ ...editForm, lat: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., 42.6629"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editForm.lng}
                      onChange={(e) => setEditForm({ ...editForm, lng: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., 21.1655"
                    />
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="space-y-4 border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-900">Social Media</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Facebook URL
                    </label>
                    <input
                      type="url"
                      value={editForm.facebookUrl}
                      onChange={(e) => setEditForm({ ...editForm, facebookUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instagram URL
                    </label>
                    <input
                      type="url"
                      value={editForm.instagramUrl}
                      onChange={(e) => setEditForm({ ...editForm, instagramUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={editForm.linkedinUrl}
                      onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://linkedin.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Twitter URL
                    </label>
                    <input
                      type="url"
                      value={editForm.twitterUrl}
                      onChange={(e) => setEditForm({ ...editForm, twitterUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                </div>
              </div>

              {/* Specialties & Certifications */}
              <div className="space-y-4 border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-900">Specialties & Certifications</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialties (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editForm.specialties.join(', ')}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      specialties: e.target.value.split(',').map(s => s.trim())
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Residential, Commercial, Luxury Properties"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certifications (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editForm.certifications.join(', ')}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      certifications: e.target.value.split(',').map(s => s.trim())
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Licensed Real Estate Agency, ISO Certified"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Languages Spoken (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editForm.languages.join(', ')}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      languages: e.target.value.split(',').map(s => s.trim())
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="English, Serbian, Croatian, Albanian"
                  />
                  <p className="text-xs text-gray-500 mt-1">Languages are auto-synced when agents join/leave</p>
                </div>
              </div>

              {/* Business Hours */}
              <div className="space-y-4 border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-900">Business Hours</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <div key={day}>
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                        {day}
                      </label>
                      <input
                        type="text"
                        value={editForm.businessHours[day as keyof typeof editForm.businessHours]}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          businessHours: { ...editForm.businessHours, [day]: e.target.value }
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="9:00 AM - 6:00 PM"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyDetailPage;

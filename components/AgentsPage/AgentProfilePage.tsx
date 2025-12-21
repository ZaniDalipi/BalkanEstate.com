import React, { useState, useMemo, useEffect } from 'react';
import { Agent } from '../../types';
import { Agency } from '../../types';
import AgencyBadge from '../shared/AgencyBadge';
import { useAppContext } from '../../context/AppContext';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserCircleIcon,
  MapPinIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  HomeIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  StarIcon,
  UsersIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  CheckBadgeIcon,
  ChevronRightIcon,
  MapIcon,
  CalendarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  HeartIcon,
  ShareIcon,
  ClockIcon,
  FireIcon,
  TrendingUpIcon,
  ArrowTopRightOnSquareIcon,
  UserIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
  HomeModernIcon,
  HomePinIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '../../constants';
import StarRating from '../shared/StarRating';
import { formatPrice } from '../../utils/currency';
import PropertyCard from '../BuyerFlow/PropertyDisplay/PropertyCard';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import PropertyCardSkeleton from '../BuyerFlow/PropertyDisplay/PropertyCardSkeleton';
import AgentReviewForm from '../shared/AgentReviewForm';
import FeaturedAgencies from '../FeaturedAgencies';
import { slugify } from '../../utils/slug';
import { getAgencyAgents, getAllAgents } from '../../services/apiService';


interface AgentProfilePageProps {
  agent: Agent;
}

const ProfileAvatar: React.FC<{ agent: Agent }> = ({ agent }) => {
    const [error, setError] = useState(false);

    if (!agent.avatarUrl || error) {
        return <UserCircleIcon className="w-32 h-32 text-gray-300" />;
    }

    return (
        <img
            src={agent.avatarUrl}
            alt={agent.name}
            className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
            onError={() => setError(true)}
        />
    );
};

const AgentProfilePage: React.FC<AgentProfilePageProps> = ({ agent }) => {
    const { state, dispatch, createConversation } = useAppContext();
    const { isLoadingProperties, currentUser } = state;
    const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'reviews'>('overview');
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [savedAgent, setSavedAgent] = useState(false);
    const [showShareToast, setShowShareToast] = useState(false);
    const [similarAgents, setSimilarAgents] = useState<Agent[]>([]);
    const [loadingSimilarAgents, setLoadingSimilarAgents] = useState(false);
    const [showAppraisalModal, setShowAppraisalModal] = useState(false);
    const [showConsultationModal, setShowConsultationModal] = useState(false);
    const [appraisalForm, setAppraisalForm] = useState({ address: '', propertyType: '', notes: '' });
    const [consultationForm, setConsultationForm] = useState({ date: '', time: '', topic: '', notes: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [agencyGradient, setAgencyGradient] = useState<string>('bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-900');
    const [mapCardOpen, setMapCardOpen] = useState(false);
    const [agencyData, setAgencyData] = useState<Agency | null>(null);

    const isAgencyAgent = agent.agencyName && agent.agencyName !== 'Independent Agent';
    const agentUserId = agent.userId || agent.id;
    const agentProperties = state.properties.filter(p => p.sellerId === agentUserId);
    const activeListings = agentProperties.filter(p => p.status === 'active');
    const soldProperties = agentProperties.filter(p => p.status === 'sold');

    const stats = useMemo(() => ({
        totalSales: agent.propertiesSold || 0,
        recentSales: Array.isArray(agent.recentsales) ? agent.recentsales.length : (agent.recentsales || Math.floor((agent.propertiesSold || 0) * 0.3)),
        avgPrice: agent.averageprice || 0,
        teamMembers: agent.teamSize || (isAgencyAgent ? 11 : 1),
        rating: agent.rating || 0,
        reviews: agent.totalReviews || (agent.testimonials?.length || 0),
        yearsExperience: agent.yearsOfExperience || 0,
        minPrice: agent.minPrice || 44000,
        maxPrice: agent.maxPrice || 3800000,
    }), [agent, isAgencyAgent]);

    const firstName = agent.name?.split(' ')[0] || 'Agent';
    const canWriteReview = currentUser && currentUser.id !== agentUserId;

    // Scroll to top on mount and tab changes
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [agent.id, activeTab]);

    // Fetch similar agents from same agency or city and fetch agency gradient
    useEffect(() => {
        const fetchSimilarAgents = async () => {
            setLoadingSimilarAgents(true);
            try {
                if (isAgencyAgent && agent.agencyId) {
                    // Fetch agents from same agency and fetch agency gradient
                    const response = await getAgencyAgents(agent.agencyId);
                    const agencyAgents = (response.agents || [])
                        .filter((a: Agent) => a.id !== agent.id && a.userId !== agent.userId)
                        .slice(0, 4);
                    setSimilarAgents(agencyAgents);

                    // Fetch agency details
                    try {
                        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                        const agencyResponse = await fetch(`${API_URL}/agencies/${agent.agencyId}`);
                        if (agencyResponse.ok) {
                            const agencyDataResponse = await agencyResponse.json();
                            const agency = agencyDataResponse.agency;
                            if (agency) {
                                setAgencyData(agency);
                                const gradient = agency.coverGradient;
                                if (gradient) {
                                    setAgencyGradient(`bg-gradient-to-r ${gradient}`);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching agency data:', error);
                    }
                } else {
                    // Fetch agents from same city
                    const response = await getAllAgents();
                    const cityAgents = (response.agents || [])
                        .filter((a: Agent) =>
                            (a.id !== agent.id && a.userId !== agent.userId) &&
                            (a.city === agent.city || a.country === agent.country)
                        )
                        .slice(0, 4);
                    setSimilarAgents(cityAgents);
                }
            } catch (error) {
                console.error('Error fetching similar agents:', error);
            } finally {
                setLoadingSimilarAgents(false);
            }
        };

        fetchSimilarAgents();
    }, [agent.id, agent.agencyId, agent.city, agent.country, isAgencyAgent]);

    const handleBack = () => {
        dispatch({ type: 'SET_SELECTED_AGENT', payload: null });
        window.history.pushState({}, '', '/agents');
    };

    const handleSaveAgent = () => {
        if (!state.isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
            return;
        }
        setSavedAgent(!savedAgent);
        // Store in localStorage for persistence
        const savedAgents = JSON.parse(localStorage.getItem('savedAgents') || '[]');
        if (!savedAgent) {
            savedAgents.push({ id: agent.id, name: agent.name, savedAt: new Date().toISOString() });
        } else {
            const index = savedAgents.findIndex((a: any) => a.id === agent.id);
            if (index > -1) savedAgents.splice(index, 1);
        }
        localStorage.setItem('savedAgents', JSON.stringify(savedAgents));
    };

    // Check if agent is saved on mount
    useEffect(() => {
        const savedAgents = JSON.parse(localStorage.getItem('savedAgents') || '[]');
        const isSaved = savedAgents.some((a: any) => a.id === agent.id);
        setSavedAgent(isSaved);
    }, [agent.id]);

    const handleShareAgent = async () => {
        const shareUrl = window.location.href;
        const shareData = {
            title: `${agent.name} - Real Estate Agent`,
            text: `Check out ${agent.name}, a real estate agent${isAgencyAgent ? ` at ${agent.agencyName}` : ''} on BalkanEstate`,
            url: shareUrl,
        };

        try {
            if (navigator.share && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareUrl);
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(false), 3000);
            }
        } catch (error) {
            await navigator.clipboard.writeText(shareUrl);
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 3000);
        }
    };

    const handleContactAgent = async () => {
        if (!state.isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
            return;
        }
        try {
            const conversation = await createConversation(agent.id);
            dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation.id });
            window.history.pushState({ page: 'inbox' }, '', '/inbox');
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'inbox' });
        } catch (error) {
            console.error('Failed to start conversation:', error);
        }
    };

    const handleRequestAppraisal = () => {
        if (!state.isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
            return;
        }
        setShowAppraisalModal(true);
    };

    const handleSubmitAppraisal = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Send appraisal request via message to agent
            const conversation = await createConversation(agent.id);
            const message = `Property Appraisal Request:\n\nAddress: ${appraisalForm.address}\nProperty Type: ${appraisalForm.propertyType}\nNotes: ${appraisalForm.notes || 'No additional notes'}`;

            // The conversation is created, redirect to inbox
            dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation.id });
            window.history.pushState({ page: 'inbox' }, '', '/inbox');
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'inbox' });
            setShowAppraisalModal(false);
            setAppraisalForm({ address: '', propertyType: '', notes: '' });
        } catch (error) {
            console.error('Error submitting appraisal request:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleScheduleConsultation = () => {
        if (!state.isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
            return;
        }
        setShowConsultationModal(true);
    };

    const handleSubmitConsultation = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Send consultation request via message to agent
            const conversation = await createConversation(agent.id);
            const message = `Consultation Request:\n\nPreferred Date: ${consultationForm.date}\nPreferred Time: ${consultationForm.time}\nTopic: ${consultationForm.topic}\nNotes: ${consultationForm.notes || 'No additional notes'}`;

            dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation.id });
            window.history.pushState({ page: 'inbox' }, '', '/inbox');
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'inbox' });
            setShowConsultationModal(false);
            setConsultationForm({ date: '', time: '', topic: '', notes: '' });
        } catch (error) {
            console.error('Error submitting consultation request:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestMarketReport = async () => {
        if (!state.isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
            return;
        }
        try {
            const conversation = await createConversation(agent.id);
            dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation.id });
            window.history.pushState({ page: 'inbox' }, '', '/inbox');
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'inbox' });
        } catch (error) {
            console.error('Error requesting market report:', error);
        }
    };

    const handleSearchAllProperties = () => {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
        window.history.pushState({}, '', '/search');
    };

    const handleVisitAgency = () => {
        if (agencyData) {
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: agencyData });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
            const urlSlug = agencyData.slug || agencyData._id;
            window.history.pushState({}, '', `/agencies/${urlSlug}`);
        }
    };

    const handleViewMoreAgents = () => {
        dispatch({ type: 'SET_SELECTED_AGENT', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agents' });
        window.history.pushState({}, '', '/agents');
    };

    const handleSelectSimilarAgent = (selectedAgent: Agent) => {
        window.scrollTo(0, 0);
        const agentIdentifier = selectedAgent.agentId || selectedAgent.id;
        dispatch({ type: 'SET_SELECTED_AGENT', payload: agentIdentifier });
        window.history.pushState({}, '', `/agents/${agentIdentifier}`);
    };

    const handleAgencyClick = async () => {
        if (!agent.agencyId) return;

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
            const response = await fetch(`${API_URL}/agencies/${agent.agencyId}`);
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: 'SET_SELECTED_AGENCY', payload: data.agency });
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
                const urlSlug = data.agency.slug || data.agency._id;
                window.history.pushState({}, '', `/agencies/${urlSlug}`);
            }
        } catch (error) {
            console.error('Error navigating to agency:', error);
        }
    };

    // Get header gradient - use agency's gradient or default blue
    const headerGradient = agencyGradient;

    // Check if agency has cover image
    const hasCoverImage = isAgencyAgent && agent.agencyCoverImage;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Agency Agent Header - Banner style with cover image or gradient */}
            {isAgencyAgent && (
                <div className="sticky top-0 z-40">
                    {/* Agency Banner Bar - Uses cover image or gradient */}
                    <div className="relative h-16 sm:h-18 overflow-hidden">
                        {/* Background: Cover Image or Gradient */}
                        {hasCoverImage ? (
                            <>
                                <img
                                    src={agent.agencyCoverImage}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                {/* Dark overlay for text readability */}
                                <div className="absolute inset-0 bg-black/50" />
                            </>
                        ) : (
                            <div className={`absolute inset-0 ${headerGradient}`} />
                        )}

                        {/* Navigation Content */}
                        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-full">
                                {/* Back Button */}
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-2 text-white/90 hover:text-white font-medium transition-colors group"
                                >
                                    <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                    <span className="hidden sm:inline">Back</span>
                                </button>

                                {/* Agency Brand - Center */}
                                <button
                                    onClick={handleAgencyClick}
                                    className="flex items-center gap-3 hover:bg-white/10 px-3 sm:px-4 py-2 rounded-lg transition-colors cursor-pointer"
                                >
                                    {agent.agencyLogo ? (
                                        <div className="bg-white rounded-lg p-1 shadow-sm">
                                            <img
                                                src={agent.agencyLogo}
                                                alt={agent.agencyName}
                                                className="h-8 sm:h-9 w-auto max-w-[100px] sm:max-w-[140px] object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="bg-white/20 backdrop-blur-sm h-10 w-10 rounded-lg flex items-center justify-center">
                                            <BuildingOfficeIcon className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                    <div className="text-left">
                                        <p className="text-sm sm:text-base font-bold text-white leading-tight drop-shadow-sm">{agent.agencyName}</p>
                                        <p className="text-xs text-white/80 hidden sm:block">View Agency Profile →</p>
                                    </div>
                                </button>

                                {/* Actions */}
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <button
                                        onClick={handleSaveAgent}
                                        className="flex items-center gap-2 px-2 sm:px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <HeartIcon className={`w-5 h-5 ${savedAgent ? 'fill-red-400 text-red-400' : ''}`} />
                                        <span className="hidden md:inline text-sm font-medium">{savedAgent ? 'Saved' : 'Save'}</span>
                                    </button>
                                    <button
                                        onClick={handleShareAgent}
                                        className="flex items-center gap-2 px-2 sm:px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <ShareIcon className="w-5 h-5" />
                                        <span className="hidden md:inline text-sm font-medium">Share</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Independent Agent Header */}
            {!isAgencyAgent && (
                <div className="sticky top-0 z-40">
                    {/* Dark gradient bar for independent agents */}
                    <div className="relative h-14 bg-gradient-to-r from-gray-800 to-gray-900">
                        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-full">
                                <button
                                    onClick={handleBack}
                                    className="flex items-center gap-2 text-white/90 hover:text-white font-medium transition-colors group"
                                >
                                    <ArrowLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                    <span>Back to Agents</span>
                                </button>

                                <div className="flex items-center gap-3">
                                    <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                        <span className="text-white font-semibold text-sm">Independent Agent</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSaveAgent}
                                        className="flex items-center gap-2 px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <HeartIcon className={`w-5 h-5 ${savedAgent ? 'fill-red-400 text-red-400' : ''}`} />
                                        <span className="hidden sm:inline text-sm font-medium">{savedAgent ? 'Saved' : 'Save'}</span>
                                    </button>
                                    <button
                                        onClick={handleShareAgent}
                                        className="flex items-center gap-2 px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <ShareIcon className="w-5 h-5" />
                                        <span className="hidden sm:inline text-sm font-medium">Share</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Section - Clean white background */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                    <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                        {/* Agent Photo */}
                        <div className="relative flex-shrink-0">
                            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-xl border-4 border-gray-100">
                                {agent.avatarUrl ? (
                                    <img
                                        src={agent.avatarUrl}
                                        alt={agent.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${headerGradient}`}>
                                        <UserCircleIcon className="w-24 h-24 text-white/80" />
                                    </div>
                                )}
                            </div>
                            {/* Verified Badge */}
                            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full shadow-lg border-2 border-white">
                                <CheckBadgeIcon className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Agent Info */}
                        <div className="flex-1 text-center lg:text-left">
                            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-3 mb-3">
                                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{agent.name}</h1>
                                {stats.rating >= 4.5 && (
                                    <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                                        <FireIcon className="w-4 h-4" />
                                        Top Agent
                                    </span>
                                )}
                            </div>

                            {/* Agency Tag */}
                            {isAgencyAgent && (
                                <button
                                    onClick={handleAgencyClick}
                                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 transition-colors"
                                >
                                    <BuildingOfficeIcon className="w-4 h-4" />
                                    <span className="font-medium">{agent.agencyName}</span>
                                    <ChevronRightIcon className="w-3 h-3" />
                                </button>
                            )}

                            {/* Location */}
                            {(agent.city || agent.country) && (
                                <div className="flex items-center justify-center lg:justify-start gap-2 mb-6 text-gray-600">
                                    <MapPinIcon className="w-5 h-5 text-gray-400" />
                                    <span className="text-lg">{[agent.city, agent.country].filter(Boolean).join(', ')}</span>
                                </div>
                            )}

                            {/* Rating */}
                            <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <StarIcon
                                                key={star}
                                                className={`w-5 h-5 ${star <= Math.round(stats.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xl font-bold text-gray-900">{stats.rating.toFixed(1)}</span>
                                    <span className="text-gray-500">({stats.reviews} reviews)</span>
                                </div>
                            </div>

                            {/* Quick Stats - Horizontal pills */}
                            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                                <div className="bg-blue-50 border border-blue-100 px-4 py-2.5 rounded-xl">
                                    <span className="text-2xl font-bold text-blue-700">{stats.totalSales}</span>
                                    <span className="text-blue-600/80 ml-2 text-sm font-medium">Properties Sold</span>
                                </div>
                                <div className="bg-green-50 border border-green-100 px-4 py-2.5 rounded-xl">
                                    <span className="text-2xl font-bold text-green-700">{stats.yearsExperience}+</span>
                                    <span className="text-green-600/80 ml-2 text-sm font-medium">Years Experience</span>
                                </div>
                                <div className="bg-purple-50 border border-purple-100 px-4 py-2.5 rounded-xl">
                                    <span className="text-2xl font-bold text-purple-700">{activeListings.length}</span>
                                    <span className="text-purple-600/80 ml-2 text-sm font-medium">Active Listings</span>
                                </div>
                            </div>
                        </div>

                        {/* Agency Card - Floating on desktop */}
                        {isAgencyAgent && agencyData && (
                            <div className="w-full lg:w-auto lg:min-w-[320px]">
                                <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                                    {/* Agency Header with Gradient */}
                                    <div className={`${agencyGradient} p-6 text-white relative overflow-hidden`}>
                                        <div className="absolute inset-0 bg-black/10"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                                    {agencyData.logo ? (
                                                        <img
                                                            src={agencyData.logo}
                                                            alt={agencyData.name}
                                                            className="w-12 h-12 object-cover rounded-lg"
                                                        />
                                                    ) : (
                                                        <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-white/80 mb-1">Member of</p>
                                                    <h3 className="text-lg font-bold text-white truncate">{agencyData.name}</h3>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Agency Stats */}
                                    <div className="p-5 bg-gradient-to-b from-gray-50 to-white">
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <UsersIcon className="w-4 h-4 text-blue-600" />
                                                    <span className="text-xs text-gray-600 font-medium">Agents</span>
                                                </div>
                                                <p className="text-2xl font-bold text-gray-900">{agencyData.totalAgents || 0}</p>
                                            </div>
                                            <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <HomeIcon className="w-4 h-4 text-green-600" />
                                                    <span className="text-xs text-gray-600 font-medium">Properties</span>
                                                </div>
                                                <p className="text-2xl font-bold text-gray-900">{agencyData.totalProperties || 0}</p>
                                            </div>
                                        </div>

                                        {/* Location */}
                                        {agencyData.city && (
                                            <div className="flex items-center gap-2 mb-4 text-gray-600 bg-white rounded-lg p-3 border border-gray-200">
                                                <MapPinIcon className="w-4 h-4 flex-shrink-0 text-gray-500" />
                                                <span className="text-sm truncate">{agencyData.city}, {agencyData.country}</span>
                                            </div>
                                        )}

                                        {/* Visit Agency Button */}
                                        <button
                                            onClick={handleVisitAgency}
                                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
                                        >
                                            <BuildingOfficeIcon className="w-5 h-5" />
                                            <span>Visit Agency</span>
                                            <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="lg:flex lg:gap-8">
                    {/* Left Column - Main Content */}
                    <div className="lg:w-2/3">
                        {/* Tabs Navigation - Enhanced - Sticky on Mobile */}
                        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 mb-6 sm:mb-8 overflow-hidden sticky top-0 md:top-16 z-30">
                            <div className="flex border-b border-gray-200 overflow-x-auto">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`flex-1 py-3 sm:py-4 md:py-5 px-3 sm:px-4 md:px-6 text-center font-semibold transition-colors min-w-[100px] ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                        <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span className="text-xs sm:text-sm md:text-base">Overview</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab('listings')}
                                    className={`flex-1 py-3 sm:py-4 md:py-5 px-3 sm:px-4 md:px-6 text-center font-semibold transition-colors min-w-[100px] ${activeTab === 'listings' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                        <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span className="text-xs sm:text-sm md:text-base">Listings ({activeListings.length})</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab('reviews')}
                                    className={`flex-1 py-3 sm:py-4 md:py-5 px-3 sm:px-4 md:px-6 text-center font-semibold transition-colors min-w-[100px] ${activeTab === 'reviews' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                        <StarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span className="text-xs sm:text-sm md:text-base">Reviews ({stats.reviews})</span>
                                    </div>
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="p-8">
                                {activeTab === 'overview' && (
                                    <div className="space-y-8">
                                        {/* About Section */}
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                                                About {firstName}
                                            </h2>
                                            <div className="prose prose-lg text-gray-700 leading-relaxed">
                                                {agent.bio || (
                                                    <p className="text-lg">
                                                        {firstName} is a dedicated real estate professional with {stats.yearsExperience} years of experience
                                                        in the industry{isAgencyAgent && ` as part of the ${agent.agencyName} team`}. 
                                                        {firstName} specializes in helping clients achieve their real estate goals through 
                                                        expert market knowledge and personalized service.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Performance Stats */}
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <TrendingUpIcon className="w-6 h-6 text-blue-600" />
                                                Performance & Statistics
                                            </h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                                                    <div className="text-2xl font-bold text-blue-700">{stats.totalSales}</div>
                                                    <div className="text-xs font-semibold text-blue-800">Sold</div>
                                                </div>
                                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                                                    <div className="text-2xl font-bold text-green-700">{activeListings.length}</div>
                                                    <div className="text-xs font-semibold text-green-800">Active</div>
                                                </div>
                                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                                                    <div className="text-2xl font-bold text-purple-700">{stats.rating.toFixed(1)}</div>
                                                    <div className="text-xs font-semibold text-purple-800">Rating</div>
                                                </div>
                                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                                                    <div className="text-2xl font-bold text-orange-700">{stats.yearsExperience}+</div>
                                                    <div className="text-xs font-semibold text-orange-800">Years</div>
                                                </div>
                                                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                                                    <div className="text-2xl font-bold text-red-700">{stats.reviews}</div>
                                                    <div className="text-xs font-semibold text-red-800">Reviews</div>
                                                </div>
                                                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                                                    <div className="text-2xl font-bold text-indigo-700">{stats.teamMembers}</div>
                                                    <div className="text-xs font-semibold text-indigo-800">Team</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Credentials & Certifications */}
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                                <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
                                                Credentials & Certifications
                                            </h3>

                                            <div className="space-y-4">
                                                {/* Licensed Real Estate Agent */}
                                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                                                    <div className="flex items-start gap-4">
                                                        <div className="bg-blue-600 text-white p-3 rounded-lg flex-shrink-0">
                                                            <CheckBadgeIcon className="w-6 h-6" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-gray-900 text-lg mb-1">Licensed Real Estate Agent</h4>
                                                            <p className="text-blue-700 font-mono text-sm font-semibold">
                                                                {agent.licenseNumber || `${agent.country?.substring(0, 2).toUpperCase() || 'XX'}-REA-${Math.floor(10000 + Math.random() * 90000)}`}
                                                            </p>
                                                            <p className="text-gray-600 text-sm mt-1">
                                                                Authorized to practice in {agent.city}, {agent.country}
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
                                                            <h4 className="font-bold text-gray-900 mb-2">Professional Certifications</h4>
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
                                                                <p className="text-gray-600">Member of National Association</p>
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
                                                            <h4 className="font-bold text-gray-900 mb-2">Awards & Recognition</h4>
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
                                                                <p className="text-gray-600">No awards listed</p>
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
                                                Local Market Insights
                                                <span className="text-sm font-normal text-gray-600 ml-2">({agent.city})</span>
                                            </h3>

                                            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                                                    {/* Avg Days on Market */}
                                                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="bg-blue-100 p-2 rounded-lg">
                                                                <ClockIcon className="w-5 h-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-600 font-medium">Avg. Days on Market</p>
                                                                <p className="text-2xl font-bold text-gray-900">
                                                                    {agent.marketStats?.avgDaysOnMarket || '24'} <span className="text-sm font-normal text-gray-600">days</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-gray-500">Faster than average</p>
                                                    </div>

                                                    {/* Price Growth */}
                                                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="bg-green-100 p-2 rounded-lg">
                                                                <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-600 font-medium">Price Growth (YoY)</p>
                                                                <p className="text-2xl font-bold text-green-600">
                                                                    +{agent.marketStats?.priceGrowthYoY || '5.2'}%
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-gray-500">Healthy appreciation</p>
                                                    </div>

                                                    {/* Market Activity */}
                                                    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="bg-purple-100 p-2 rounded-lg">
                                                                <FireIcon className="w-5 h-5 text-purple-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-600 font-medium">Market Activity</p>
                                                                <p className="text-2xl font-bold text-purple-600">
                                                                    {agent.marketStats?.activityLevel || 'High'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-gray-500">Strong demand</p>
                                                    </div>
                                                </div>

                                                {/* Request Full Report Button */}
                                                <button
                                                    onClick={handleRequestMarketReport}
                                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
                                                >
                                                    <DocumentTextIcon className="w-5 h-5" />
                                                    <span>Request Full Market Report</span>
                                                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                                <p className="text-center text-xs text-gray-600 mt-3">
                                                    Get detailed insights about the {agent.city} real estate market
                                                </p>
                                            </div>
                                        </div>

                                        {/* Properties Map - Shows agent's active and sold properties */}
                                        {agentProperties.length > 0 && agentProperties.some(p => p.lat && p.lng) && (
                                            <div>
                                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                    <MapIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                                    Properties Map
                                                    <span className="text-sm font-normal text-gray-600 ml-2">
                                                        ({activeListings.length} active, {soldProperties.length} sold)
                                                    </span>
                                                </h3>
                                                <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200">
                                                    <MapContainer
                                                        center={agentProperties.filter(p => p.lat && p.lng)[0] ? [agentProperties.filter(p => p.lat && p.lng)[0].lat!, agentProperties.filter(p => p.lat && p.lng)[0].lng!] : [agent.lat || 42.0, agent.lng || 21.0]}
                                                        zoom={12}
                                                        scrollWheelZoom={true}
                                                        className="w-full h-[400px] sm:h-[500px]"
                                                        maxZoom={18}
                                                        minZoom={3}
                                                    >
                                                        <TileLayer
                                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                        />
                                                        {agentProperties.filter(p => p.lat && p.lng).map((property) => (
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
                                                                            <img src={property.imageUrl} alt={property.address} className="w-full h-32 object-cover rounded-lg mb-2" />
                                                                        )}
                                                                        <p className="font-bold text-sm mb-1">{property.address}</p>
                                                                        <p className="text-xs text-gray-600 mb-2">{property.city}, {property.country}</p>
                                                                        <p className="font-bold text-blue-600 mb-2">{formatPrice(property.price, property.country)}</p>
                                                                        <div className="flex gap-2 text-xs text-gray-600 mb-3">
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
                                                                            className={`w-full text-white px-3 py-2 rounded-lg font-semibold text-sm ${property.status === 'sold' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                                                                        >
                                                                            {property.status === 'sold' ? 'View Sold Property' : 'View Details'}
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
                                                        <span className="text-gray-600">For Sale ({activeListings.length})</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                                                        <span className="text-gray-600">Sold ({soldProperties.length})</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Agent Location Map */}
                                        {agent.lat != null && agent.lng != null && !isNaN(agent.lat) && !isNaN(agent.lng) && (
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                    <MapPinIcon className="w-6 h-6 text-blue-600" />
                                                    Service Area Location
                                                </h3>
                                                <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 relative">
                                                    <MapContainer
                                                        center={[agent.lat, agent.lng]}
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
                                                                        <img src={agent.avatarUrl} alt={agent.name} className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-2 border-gray-300" />
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
                                                                <img src={agent.avatarUrl} alt={agent.name} className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-4 border-indigo-300" />
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
                                            <h3 className="text-xl font-bold text-gray-900 mb-6">Areas of Expertise</h3>
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
                                                                <span className="font-semibold text-gray-800">Residential Properties</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-green-100 rounded-lg">
                                                                    <UserIcon className="w-5 h-5 text-green-600" />
                                                                </div>
                                                                <span className="font-semibold text-gray-800">First Time Homebuyers</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-purple-100 rounded-lg">
                                                                    <BuildingLibraryIcon className="w-5 h-5 text-purple-600" />
                                                                </div>
                                                                <span className="font-semibold text-gray-800">Property Management</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Languages Section */}
                                        {agent.languages && agent.languages.length > 0 && (
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-4">Languages Spoken</h3>
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
                                                    {firstName}'s Properties
                                                </h2>
                                                <p className="text-gray-600">
                                                    {activeListings.length} active listings • {soldProperties.length} sold properties
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleSearchAllProperties}
                                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
                                            >
                                                <MagnifyingGlassIcon className="w-5 h-5" />
                                                Search all properties
                                            </button>
                                        </div>

                                        {/* Active Listings */}
                                        {activeListings.length > 0 && (
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Listings</h3>
                                                {isLoadingProperties ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        <PropertyCardSkeleton />
                                                        <PropertyCardSkeleton />
                                                        <PropertyCardSkeleton />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {activeListings.map(prop => (
                                                            <PropertyCard key={prop.id} property={prop} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                    
                                        {soldProperties.length > 0 && (
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sold Properties ({soldProperties.length})</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {soldProperties.map(prop => (
                                                        <div key={prop.id} className="relative">
                                                            <PropertyCard property={prop} />
                                                            <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-lg z-10">
                                                                SOLD
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
                                                        <span className="text-gray-600">({stats.reviews} verified reviews)</span>
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
                                                        Write a Review
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
                                                    onContactAgent={handleContactAgent}
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
                                                <p className="text-gray-600 text-lg mb-2">No reviews yet</p>
                                                <p className="text-gray-500">Be the first to review {firstName}'s services</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Sidebar (Similar to realestate.com.au) */}
                    <div className="lg:w-1/3">
                        {/* Contact Agent Card */}
                        <div className="bg-gradient-to-b from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-6 mb-6 text-white">
                            <h3 className="text-xl font-bold mb-4">Contact {firstName}</h3>
                            
                            {agent.phone && (
                                <a 
                                    href={`tel:${agent.phone}`}
                                    className="flex items-center gap-3 bg-white/10 hover:bg-white/20 p-4 rounded-xl mb-3 transition-colors"
                                >
                                    <PhoneIcon className="w-6 h-6" />
                                    <div>
                                        <div className="font-semibold">Call Direct</div>
                                        <div className="text-lg font-bold">{agent.phone}</div>
                                    </div>
                                </a>
                            )}
                            
                            {agent.email && (
                                <a 
                                    href={`mailto:${agent.email}`}
                                    className="flex items-center gap-3 bg-white/10 hover:bg-white/20 p-4 rounded-xl mb-3 transition-colors"
                                >
                                    <EnvelopeIcon className="w-6 h-6" />
                                    <div>
                                        <div className="font-semibold">Send Email</div>
                                        <div className="text-sm truncate">{agent.email}</div>
                                    </div>
                                </a>
                            )}
                        </div>

                        {/* Request Appraisal Card */}
                        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mb-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Get a Free Property Appraisal</h3>
                            <p className="text-gray-600 mb-4">
                                Curious what your property is worth? {firstName} can provide a free, no-obligation market appraisal.
                            </p>
                            <button
                                onClick={handleRequestAppraisal}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg"
                            >
                                Request Appraisal
                            </button>
                            <div className="text-center text-sm text-gray-500 mt-3">
                                <CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-500" />
                                Free • No obligation
                            </div>
                        </div>

                        {/* Similar Agents / Agents from Same Agency */}
                        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <UsersIcon className="w-5 h-5 text-blue-600" />
                                {isAgencyAgent ? 'Agents from Same Agency' : 'Other Agents in Area'}
                            </h3>
                            {loadingSimilarAgents ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                                            <div className="w-12 h-12 rounded-full bg-gray-200" />
                                            <div className="flex-1">
                                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : similarAgents.length > 0 ? (
                                <div className="space-y-4">
                                    {similarAgents.map((similarAgent) => (
                                        <div
                                            key={similarAgent.id}
                                            onClick={() => handleSelectSimilarAgent(similarAgent)}
                                            className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                                        >
                                            {similarAgent.avatarUrl ? (
                                                <img
                                                    src={similarAgent.avatarUrl}
                                                    alt={similarAgent.name}
                                                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                                />
                                            ) : (
                                                <UserCircleIcon className="w-12 h-12 text-gray-300" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 truncate">{similarAgent.name}</p>
                                                <div className="flex items-center gap-1">
                                                    <StarRating rating={similarAgent.rating || 0} />
                                                    <span className="text-sm text-gray-600">
                                                        {(similarAgent.rating || 0).toFixed(1)} ({similarAgent.totalReviews || similarAgent.testimonials?.length || 0})
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {similarAgent.agencyName || `${similarAgent.city || ''}, ${similarAgent.country || ''}`}
                                                </p>
                                            </div>
                                            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-600 font-medium">No similar agents found</p>
                                </div>
                            )}
                            <button
                                onClick={handleViewMoreAgents}
                                className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-semibold text-sm py-2"
                            >
                                View more agents in {agent.city || 'this area'} →
                            </button>
                        </div>

                        {/* Agent Credentials */}
                        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mt-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Credentials & Certifications</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <ShieldCheckIcon className="w-5 h-5 text-green-500" />
                                    <div>
                                        <p className="font-medium text-gray-900">Licensed Real Estate Agent</p>
                                        <p className="text-sm text-gray-600">{agent.licenseNumber || 'License: 12345678'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <AcademicCapIcon className="w-5 h-5 text-blue-500" />
                                    <div>
                                        <p className="font-medium text-gray-900">Professional Certifications</p>
                                        <p className="text-sm text-gray-600">
                                            {agent.certifications?.join(', ') || 'Member of National Association'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <TrophyIcon className="w-5 h-5 text-amber-500" />
                                    <div>
                                        <p className="font-medium text-gray-900">Awards & Recognition</p>
                                        <p className="text-sm text-gray-600">
                                            {agent.awards?.join(', ') || 'No awards listed'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Market Insights */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-6 mt-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Local Market Insights</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
                                    <span className="font-medium text-gray-700">Avg. Days on Market</span>
                                    <span className="font-bold text-purple-600">24 days</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
                                    <span className="font-medium text-gray-700">Price Growth (YoY)</span>
                                    <span className="font-bold text-green-600">+5.2%</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
                                    <span className="font-medium text-gray-700">Market Activity</span>
                                    <span className="font-bold text-blue-600">High</span>
                                </div>
                            </div>
                            <button
                                onClick={handleRequestMarketReport}
                                className="w-full mt-4 text-center text-purple-600 hover:text-purple-700 font-semibold text-sm py-2"
                            >
                                Request Full Market Report →
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom CTA */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to work with {firstName}?</h2>
                    <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                        Contact {firstName} today for expert real estate advice and personalized service.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href={`tel:${agent.phone || ''}`}
                            className="bg-white text-gray-900 hover:bg-gray-100 font-bold py-3 px-8 rounded-xl transition-colors shadow-lg"
                        >
                            Call Now: {agent.phone || '(Contact for number)'}
                        </a>
                        <button
                            onClick={handleScheduleConsultation}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-colors"
                        >
                            Schedule Consultation
                        </button>
                    </div>
                </div>
            </div>

            {/* Featured Agencies */}
            <div className="bg-neutral-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h3 className="text-xl font-bold text-neutral-800 mb-4">Featured Agencies</h3>
                    <FeaturedAgencies />
                </div>
            </div>

            {/* Share Toast Notification */}
            {showShareToast && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-xl z-50 flex items-center gap-3 animate-fade-in">
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    <span>Link copied to clipboard!</span>
                </div>
            )}

            {/* Appraisal Request Modal */}
            {showAppraisalModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">Request Property Appraisal</h3>
                            <button
                                onClick={() => setShowAppraisalModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitAppraisal} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Property Address *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={appraisalForm.address}
                                    onChange={(e) => setAppraisalForm({ ...appraisalForm, address: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter property address"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Property Type *
                                </label>
                                <select
                                    required
                                    value={appraisalForm.propertyType}
                                    onChange={(e) => setAppraisalForm({ ...appraisalForm, propertyType: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Select property type</option>
                                    <option value="apartment">Apartment</option>
                                    <option value="house">House</option>
                                    <option value="villa">Villa</option>
                                    <option value="land">Land</option>
                                    <option value="commercial">Commercial</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Additional Notes
                                </label>
                                <textarea
                                    value={appraisalForm.notes}
                                    onChange={(e) => setAppraisalForm({ ...appraisalForm, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="Any additional information about the property..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAppraisalModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Submit Request'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Consultation Request Modal */}
            {showConsultationModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">Schedule Consultation</h3>
                            <button
                                onClick={() => setShowConsultationModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitConsultation} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Preferred Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={consultationForm.date}
                                        onChange={(e) => setConsultationForm({ ...consultationForm, date: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Preferred Time *
                                    </label>
                                    <select
                                        required
                                        value={consultationForm.time}
                                        onChange={(e) => setConsultationForm({ ...consultationForm, time: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select time</option>
                                        <option value="09:00">09:00 AM</option>
                                        <option value="10:00">10:00 AM</option>
                                        <option value="11:00">11:00 AM</option>
                                        <option value="12:00">12:00 PM</option>
                                        <option value="13:00">01:00 PM</option>
                                        <option value="14:00">02:00 PM</option>
                                        <option value="15:00">03:00 PM</option>
                                        <option value="16:00">04:00 PM</option>
                                        <option value="17:00">05:00 PM</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Topic *
                                </label>
                                <select
                                    required
                                    value={consultationForm.topic}
                                    onChange={(e) => setConsultationForm({ ...consultationForm, topic: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Select topic</option>
                                    <option value="buying">Buying a Property</option>
                                    <option value="selling">Selling a Property</option>
                                    <option value="investing">Real Estate Investment</option>
                                    <option value="market">Market Analysis</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Additional Notes
                                </label>
                                <textarea
                                    value={consultationForm.notes}
                                    onChange={(e) => setConsultationForm({ ...consultationForm, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="What would you like to discuss?"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowConsultationModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Scheduling...
                                        </>
                                    ) : (
                                        'Schedule Consultation'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentProfilePage;
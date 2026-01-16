import { useState, useMemo, useEffect, useCallback } from 'react';
import { Agent, Agency } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { useTrackView } from '@/src/features/view-stats/hooks';
import { getAgencyAgents, getAllAgents } from '@/services/apiService';
import { updateAgentProfile, toggleSavedAgent, checkSavedAgent } from '@/src/features/agents/api/agentApi';
import { slugify } from '@/utils/slug';

// Types for the hook
export type ProfileTab = 'overview' | 'listings' | 'reviews';

export interface EditFormState {
    bio: string;
    specializations: string[];
    yearsOfExperience: number;
    languages: string[];
    serviceAreas: string[];
    websiteUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    linkedinUrl: string;
    officeAddress: string;
    officePhone: string;
}

export interface AppraisalFormState {
    address: string;
    propertyType: string;
    notes: string;
}

export interface ConsultationFormState {
    date: string;
    time: string;
    topic: string;
    notes: string;
}

export interface AgentStats {
    totalSales: number;
    recentSales: number;
    avgPrice: number;
    teamMembers: number;
    rating: number;
    reviews: number;
    yearsExperience: number;
    minPrice: number;
    maxPrice: number;
}

export interface MarketInsights {
    avgDaysOnMarket: number;
    priceGrowth: number;
    activityLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
    daysDescription: string;
    growthDescription: string;
    activityDescription: string;
}

export function useAgentProfile(agent: Agent) {
    const { state, dispatch, createConversation } = useAppContext();
    const { currentUser } = state;

    // Track page view for analytics
    useTrackView({
        entityType: 'agent',
        entityId: agent.id,
        enabled: !!agent.id,
    });

    // UI State
    const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [savedAgent, setSavedAgent] = useState(false);
    const [showShareToast, setShowShareToast] = useState(false);
    const [showAppraisalModal, setShowAppraisalModal] = useState(false);
    const [showConsultationModal, setShowConsultationModal] = useState(false);
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [mapCardOpen, setMapCardOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Data State
    const [similarAgents, setSimilarAgents] = useState<Agent[]>([]);
    const [loadingSimilarAgents, setLoadingSimilarAgents] = useState(false);
    const [agencyGradient, setAgencyGradient] = useState<string>('bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-900');
    const [agencyData, setAgencyData] = useState<Agency | null>(null);
    const [agentData, setAgentData] = useState(agent);

    // Form State
    const [appraisalForm, setAppraisalForm] = useState<AppraisalFormState>({ address: '', propertyType: '', notes: '' });
    const [consultationForm, setConsultationForm] = useState<ConsultationFormState>({ date: '', time: '', topic: '', notes: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [editForm, setEditForm] = useState<EditFormState>({
        bio: agent.bio || '',
        specializations: agent.specializations || [],
        yearsOfExperience: agent.yearsOfExperience || 0,
        languages: agent.languages || [],
        serviceAreas: agent.serviceAreas || [],
        websiteUrl: agent.websiteUrl || '',
        facebookUrl: agent.facebookUrl || '',
        instagramUrl: agent.instagramUrl || '',
        linkedinUrl: agent.linkedinUrl || '',
        officeAddress: agent.officeAddress || '',
        officePhone: agent.officePhone || '',
    });

    // Derived values
    const isAgencyAgent = agent.agencyName && agent.agencyName !== 'Independent Agent';
    const agentUserId = agent.userId || agent.id;
    const firstName = agent.name?.split(' ')[0] || 'Agent';

    const isOwner = currentUser && (
        String(currentUser.id) === String(agent.userId) ||
        String(currentUser._id) === String(agent.userId) ||
        String(currentUser.id) === String(agent.id) ||
        String(currentUser._id) === String(agent.id)
    );

    const canWriteReview = currentUser && currentUser.id !== agentUserId;

    // Properties
    const agentProperties = state.properties.filter(p => p.sellerId === agentUserId);
    const activeListings = agentProperties.filter(p => p.status === 'active');
    const soldProperties = agentProperties.filter(p => p.status === 'sold');

    // Computed stats
    const stats = useMemo<AgentStats>(() => ({
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

    // Market insights
    const marketInsights = useMemo<MarketInsights>(() => {
        const propertiesSold = agent.propertiesSold || 0;
        const activeListingsCount = agent.activeListings || activeListings.length || 0;
        const yearsExp = agent.yearsOfExperience || 0;
        const avgPrice = agent.averageprice || 0;

        let avgDaysOnMarket = 45;
        if (propertiesSold > 50) avgDaysOnMarket -= 15;
        else if (propertiesSold > 20) avgDaysOnMarket -= 10;
        else if (propertiesSold > 10) avgDaysOnMarket -= 5;
        if (yearsExp > 10) avgDaysOnMarket -= 8;
        else if (yearsExp > 5) avgDaysOnMarket -= 4;
        avgDaysOnMarket = Math.max(14, avgDaysOnMarket);

        let priceGrowth = 5.5;
        if (avgPrice > 500000) priceGrowth = 3.8;
        else if (avgPrice > 200000) priceGrowth = 4.5;
        else if (avgPrice < 100000) priceGrowth = 6.2;
        const cityHash = (agent.city || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        priceGrowth += (cityHash % 20 - 10) / 10;
        priceGrowth = Math.round(priceGrowth * 10) / 10;

        let activityLevel: 'Low' | 'Moderate' | 'High' | 'Very High' = 'Moderate';
        const activityScore = activeListingsCount + (propertiesSold * 0.5);
        if (activityScore > 30) activityLevel = 'Very High';
        else if (activityScore > 15) activityLevel = 'High';
        else if (activityScore > 5) activityLevel = 'Moderate';
        else activityLevel = 'Low';

        const daysDescription = avgDaysOnMarket < 30 ? 'profilePage.marketInsights.fasterThanAverage' :
                               avgDaysOnMarket < 45 ? 'profilePage.marketInsights.averageTime' :
                               'profilePage.marketInsights.slowerThanAverage';
        const growthDescription = priceGrowth > 5 ? 'profilePage.marketInsights.healthyAppreciation' :
                                 priceGrowth > 3 ? 'profilePage.marketInsights.steadyGrowth' :
                                 'profilePage.marketInsights.stableMarket';
        const activityDescription = activityLevel === 'Very High' || activityLevel === 'High' ?
                                   'profilePage.marketInsights.strongDemand' :
                                   'profilePage.marketInsights.moderateDemand';

        return {
            avgDaysOnMarket,
            priceGrowth,
            activityLevel,
            daysDescription,
            growthDescription,
            activityDescription
        };
    }, [agent, activeListings.length]);

    // Effects
    useEffect(() => {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [agent.id]);

    useEffect(() => {
        const fetchSimilarAgents = async () => {
            setLoadingSimilarAgents(true);
            try {
                if (isAgencyAgent && agent.agencyId) {
                    const response = await getAgencyAgents(agent.agencyId);
                    if (response.agency) {
                        setAgencyData(response.agency);
                        if (response.agency.coverGradient) {
                            setAgencyGradient(`bg-gradient-to-r ${response.agency.coverGradient}`);
                        }
                    }
                    const agencyAgents = (response.agents || [])
                        .filter((a: Agent) => a.id !== agent.id)
                        .slice(0, 4);
                    setSimilarAgents(agencyAgents);
                } else {
                    const response = await getAllAgents();
                    const sameCity = response.filter((a: Agent) =>
                        a.id !== agent.id &&
                        a.city?.toLowerCase() === agent.city?.toLowerCase()
                    ).slice(0, 4);
                    setSimilarAgents(sameCity.length > 0 ? sameCity : response.filter((a: Agent) => a.id !== agent.id).slice(0, 4));
                }
            } catch {
                setSimilarAgents([]);
            } finally {
                setLoadingSimilarAgents(false);
            }
        };
        fetchSimilarAgents();
    }, [agent.id, agent.agencyId, agent.city, isAgencyAgent]);

    useEffect(() => {
        if (currentUser) {
            const checkIfSaved = async () => {
                try {
                    const result = await checkSavedAgent(agent.id);
                    setSavedAgent(result.isSaved);
                } catch {
                    // Ignore error
                }
            };
            checkIfSaved();
        }
    }, [agent.id, currentUser]);

    // Handlers
    const handleBack = useCallback(() => {
        dispatch({ type: 'SET_SELECTED_AGENT', payload: null });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agents' });
    }, [dispatch]);

    const handleSaveAgent = useCallback(async () => {
        if (!currentUser) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
            return;
        }
        try {
            const result = await toggleSavedAgent(agent.id);
            setSavedAgent(result.isSaved);
        } catch {
            // Ignore error
        }
    }, [agent.id, currentUser, dispatch]);

    const handleShareAgent = useCallback(async () => {
        const shareUrl = `${window.location.origin}/agents/${agent.id}`;
        const shareData = {
            title: `${agent.name} - Real Estate Agent`,
            text: `Check out ${agent.name}, a professional real estate agent${agent.agencyName ? ` at ${agent.agencyName}` : ''}`,
            url: shareUrl,
        };
        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareUrl);
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(false), 3000);
            }
        } catch {
            await navigator.clipboard.writeText(shareUrl);
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 3000);
        }
    }, [agent]);

    const handleContactAgent = useCallback(async () => {
        if (!currentUser) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
            return;
        }
        setShowInquiryModal(true);
    }, [currentUser, dispatch]);

    const handleRequestAppraisal = useCallback(() => {
        if (!currentUser) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
            return;
        }
        setShowAppraisalModal(true);
    }, [currentUser, dispatch]);

    const handleSubmitAppraisal = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createConversation(agentUserId, `Property Appraisal Request:\nAddress: ${appraisalForm.address}\nType: ${appraisalForm.propertyType}\nNotes: ${appraisalForm.notes}`);
            setShowAppraisalModal(false);
            setAppraisalForm({ address: '', propertyType: '', notes: '' });
            dispatch({ type: 'SHOW_ALERT', payload: { type: 'success', title: 'Request Sent', message: 'Your appraisal request has been sent to the agent.' } });
        } catch {
            dispatch({ type: 'SHOW_ALERT', payload: { type: 'error', title: 'Error', message: 'Failed to send appraisal request. Please try again.' } });
        } finally {
            setIsSubmitting(false);
        }
    }, [appraisalForm, agentUserId, createConversation, dispatch]);

    const handleScheduleConsultation = useCallback(() => {
        if (!currentUser) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
            return;
        }
        setShowConsultationModal(true);
    }, [currentUser, dispatch]);

    const handleSubmitConsultation = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createConversation(agentUserId, `Consultation Request:\nDate: ${consultationForm.date}\nTime: ${consultationForm.time}\nTopic: ${consultationForm.topic}\nNotes: ${consultationForm.notes}`);
            setShowConsultationModal(false);
            setConsultationForm({ date: '', time: '', topic: '', notes: '' });
            dispatch({ type: 'SHOW_ALERT', payload: { type: 'success', title: 'Request Sent', message: 'Your consultation request has been sent to the agent.' } });
        } catch {
            dispatch({ type: 'SHOW_ALERT', payload: { type: 'error', title: 'Error', message: 'Failed to send consultation request. Please try again.' } });
        } finally {
            setIsSubmitting(false);
        }
    }, [consultationForm, agentUserId, createConversation, dispatch]);

    const handleRequestMarketReport = useCallback(async () => {
        if (!currentUser) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
            return;
        }
        try {
            await createConversation(agentUserId, `Market Report Request:\nI would like to receive a market report for ${agent.city || 'my area'}.`);
            dispatch({ type: 'SHOW_ALERT', payload: { type: 'success', title: 'Request Sent', message: 'Your market report request has been sent to the agent.' } });
        } catch {
            dispatch({ type: 'SHOW_ALERT', payload: { type: 'error', title: 'Error', message: 'Failed to send market report request. Please try again.' } });
        }
    }, [agent.city, agentUserId, currentUser, createConversation, dispatch]);

    const handleSearchAllProperties = useCallback(() => {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
    }, [dispatch]);

    const handleVisitAgency = useCallback(() => {
        if (agent.agencyId) {
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: agent.agencyId });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
            window.history.pushState({}, '', `/agencies/${agent.agencyId}`);
        }
    }, [agent.agencyId, dispatch]);

    const handleViewMoreAgents = useCallback(() => {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agents' });
        window.history.pushState({}, '', '/agents');
    }, [dispatch]);

    const handleSelectSimilarAgent = useCallback((selectedAgent: Agent) => {
        dispatch({ type: 'SET_SELECTED_AGENT', payload: selectedAgent.id });
        const agentSlug = slugify(selectedAgent.name || '');
        window.history.pushState({}, '', `/agents/${selectedAgent.id}${agentSlug ? `-${agentSlug}` : ''}`);
    }, [dispatch]);

    const handleAgencyClick = useCallback(async () => {
        if (agent.agencyId) {
            dispatch({ type: 'SET_SELECTED_AGENT', payload: null });
            dispatch({ type: 'SET_SELECTED_AGENCY', payload: agent.agencyId });
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
            const agencySlug = agencyData ? slugify(agencyData.name) : '';
            window.history.pushState({}, '', `/agencies/${agent.agencyId}${agencySlug ? `-${agencySlug}` : ''}`);
        }
    }, [agent.agencyId, agencyData, dispatch]);

    const handleOpenEditModal = useCallback(() => {
        setEditForm({
            bio: agentData.bio || '',
            specializations: agentData.specializations || [],
            yearsOfExperience: agentData.yearsOfExperience || 0,
            languages: agentData.languages || [],
            serviceAreas: agentData.serviceAreas || [],
            websiteUrl: agentData.websiteUrl || '',
            facebookUrl: agentData.facebookUrl || '',
            instagramUrl: agentData.instagramUrl || '',
            linkedinUrl: agentData.linkedinUrl || '',
            officeAddress: agentData.officeAddress || '',
            officePhone: agentData.officePhone || '',
        });
        setIsEditModalOpen(true);
    }, [agentData]);

    const handleSaveProfile = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            const updated = await updateAgentProfile(agent.id, editForm);
            setAgentData(prev => ({ ...prev, ...updated }));
            setIsEditModalOpen(false);
            dispatch({ type: 'SHOW_ALERT', payload: { type: 'success', title: 'Profile Updated', message: 'Your profile has been successfully updated.' } });
        } catch {
            dispatch({ type: 'SHOW_ALERT', payload: { type: 'error', title: 'Error', message: 'Failed to update profile. Please try again.' } });
        } finally {
            setIsSavingProfile(false);
        }
    }, [agent.id, editForm, dispatch]);

    const handleAddArrayItem = useCallback((field: 'specializations' | 'languages' | 'serviceAreas', value: string) => {
        if (value.trim() && !editForm[field].includes(value.trim())) {
            setEditForm(prev => ({
                ...prev,
                [field]: [...prev[field], value.trim()]
            }));
        }
    }, [editForm]);

    const handleRemoveArrayItem = useCallback((field: 'specializations' | 'languages' | 'serviceAreas', index: number) => {
        setEditForm(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    }, []);

    return {
        // State
        activeTab,
        showReviewForm,
        savedAgent,
        showShareToast,
        similarAgents,
        loadingSimilarAgents,
        showAppraisalModal,
        showConsultationModal,
        showInquiryModal,
        appraisalForm,
        consultationForm,
        isSubmitting,
        agencyGradient,
        mapCardOpen,
        agencyData,
        isEditModalOpen,
        isSavingProfile,
        agentData,
        editForm,

        // Setters
        setActiveTab,
        setShowReviewForm,
        setShowShareToast,
        setShowAppraisalModal,
        setShowConsultationModal,
        setShowInquiryModal,
        setAppraisalForm,
        setConsultationForm,
        setMapCardOpen,
        setIsEditModalOpen,
        setEditForm,

        // Derived
        isAgencyAgent,
        isOwner,
        canWriteReview,
        firstName,
        agentUserId,
        agentProperties,
        activeListings,
        soldProperties,
        stats,
        marketInsights,
        currentUser,
        isLoadingProperties: state.isLoadingProperties,

        // Handlers
        handleBack,
        handleSaveAgent,
        handleShareAgent,
        handleContactAgent,
        handleRequestAppraisal,
        handleSubmitAppraisal,
        handleScheduleConsultation,
        handleSubmitConsultation,
        handleRequestMarketReport,
        handleSearchAllProperties,
        handleVisitAgency,
        handleViewMoreAgents,
        handleSelectSimilarAgent,
        handleAgencyClick,
        handleOpenEditModal,
        handleSaveProfile,
        handleAddArrayItem,
        handleRemoveArrayItem,
    };
}

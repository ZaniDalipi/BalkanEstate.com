import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Agent, Agency } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { useRealtimeProperties } from '@/src/features/properties/hooks';
import { getAgencyAgents, getAllAgents } from '@/services/apiService';
import { getPropertiesBySellerId } from '@/src/features/properties/api/propertyApi';
import { useTrackView } from '@/src/features/view-stats/hooks';
import { updateAgentProfile, toggleSavedAgent, checkSavedAgent, getAgent as fetchAgentById } from '@/src/features/agents/api/agentApi';
import { Achievement } from '@/components/shared/AchievementsSection';
import {
  getUserAchievements,
  addUserAchievement,
  updateUserAchievement,
  deleteUserAchievement
} from '@/src/features/achievements/api/achievementApi';
import { Credential, getCredentials, getAgentPublicCredentials } from '@/src/features/credentials/api/credentialApi';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { sendMessage } from '@/src/features/conversations/api/conversationApi';
import { API_URL } from '@/src/shared/api/config';
import { buildLocalizedPath } from '@/src/utils/languageRouting';

// ─── Shared Types ────────────────────────────────────────────────────────────

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
    avgPrice: number;
    avgDaysToSell: number;
    totalSold: number;
    totalActive: number;
    totalRented: number;
    priceRange: { min: number; max: number } | null;
    hasRealSalesData: boolean;
}

export interface EditFormData {
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

export interface AppraisalFormData {
    address: string;
    propertyType: string;
    notes: string;
}

export interface ConsultationFormData {
    date: string;
    time: string;
    topic: string;
    notes: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAgentProfile({ agent }: { agent: Agent }) {
    const { t } = useTranslation(['agents']);
    const { state, dispatch, createConversation } = useAppContext();
    const { isLoadingProperties, currentUser } = state;

    // Track page view for analytics
    useTrackView({
        entityType: 'agent',
        entityId: agent.id,
        enabled: !!agent.id,
    });

    // ─── State ───────────────────────────────────────────────────────────────

    const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'reviews'>('overview');
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [savedAgent, setSavedAgent] = useState(false);
    const [showShareToast, setShowShareToast] = useState(false);
    const [similarAgents, setSimilarAgents] = useState<Agent[]>([]);
    const [loadingSimilarAgents, setLoadingSimilarAgents] = useState(false);
    const [showAppraisalModal, setShowAppraisalModal] = useState(false);
    const [showConsultationModal, setShowConsultationModal] = useState(false);
    const [showMarketReportModal, setShowMarketReportModal] = useState(false);
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [appraisalForm, setAppraisalForm] = useState<AppraisalFormData>({ address: '', propertyType: '', notes: '' });
    const [consultationForm, setConsultationForm] = useState<ConsultationFormData>({ date: '', time: '', topic: '', notes: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [agencyGradient, setAgencyGradient] = useState<string>('bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-900');
    const [mapCardOpen, setMapCardOpen] = useState(false);
    const [agencyData, setAgencyData] = useState<Agency | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [agentData, setAgentData] = useState(agent);
    const [agentAchievements, setAgentAchievements] = useState<Achievement[]>([]);
    const [agentCredentials, setAgentCredentials] = useState<Credential[]>([]);
    const [fetchedProperties, setFetchedProperties] = useState<any[]>([]);
    const [loadingProperties, setLoadingProperties] = useState(true);
    const { success, error: showError } = useNotification();
    const shareToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);
    const [editForm, setEditForm] = useState<EditFormData>({
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

    // ─── Computed Values ─────────────────────────────────────────────────────

    const isAgencyAgent: string | false = agent.agencyName && agent.agencyName !== 'Independent Agent'
        ? agent.agencyName
        : false;

    // Validate agent coordinates - must be valid and within Balkans region (roughly lat: 35-47, lng: 13-31)
    // Coordinates of (0, 0) are in the Atlantic Ocean and clearly invalid
    const hasValidCoordinates = useMemo(() => {
        if (agent.lat == null || agent.lng == null) return false;
        if (isNaN(agent.lat) || isNaN(agent.lng)) return false;
        // Check for (0,0) which is a common default but invalid for Balkans
        if (agent.lat === 0 && agent.lng === 0) return false;
        // Check if within reasonable Balkans bounds
        const isInBalkans = agent.lat >= 35 && agent.lat <= 47 && agent.lng >= 13 && agent.lng <= 31;
        return isInBalkans;
    }, [agent.lat, agent.lng]);

    // Check if current user is the owner of this agent profile
    const isOwner = currentUser && (
        String(currentUser.id) === String(agent.userId) ||
        String(currentUser._id) === String(agent.userId) ||
        String(currentUser.id) === String(agent.id) ||
        String(currentUser._id) === String(agent.id)
    );
    const agentUserId = agent.userId || agent.id;

    // Combine fetched properties with state.properties, removing duplicates
    const stateProperties = state.properties.filter(p =>
        String(p.sellerId) === String(agentUserId) ||
        String(p.sellerId) === String(agent.userId) ||
        String(p.sellerId) === String(agent.id)
    );
    const allAgentProperties = useMemo(() => {
        const propertyMap = new Map();
        // Add fetched properties first
        fetchedProperties.forEach(p => propertyMap.set(p.id, p));
        // Add state properties (won't overwrite if already exists)
        stateProperties.forEach(p => {
            if (!propertyMap.has(p.id)) propertyMap.set(p.id, p);
        });
        return Array.from(propertyMap.values());
    }, [fetchedProperties, stateProperties]);

    const activeListings = allAgentProperties.filter(p => p.status === 'active');
    const soldProperties = allAgentProperties.filter(p => p.status === 'sold');
    const rentedProperties = allAgentProperties.filter(p => p.status === 'rented');

    const stats: AgentStats = useMemo(() => ({
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

    // Compute market insights from real property data
    const marketInsights: MarketInsights = useMemo(() => {
        // Compute average price from real properties
        const allPrices = allAgentProperties.filter(p => p.price > 0).map(p => p.price);
        const avgPrice = allPrices.length > 0
            ? Math.round(allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length)
            : (agent.averageprice || 0);

        // Compute price range from real listings
        const priceRange = allPrices.length > 0
            ? { min: Math.min(...allPrices), max: Math.max(...allPrices) }
            : null;

        // Compute average days to sell from sold properties with real dates
        let avgDaysToSell = 0;
        let hasRealSalesData = false;
        const soldWithDates = soldProperties.filter(p => p.createdAt && p.soldAt);
        if (soldWithDates.length > 0) {
            hasRealSalesData = true;
            const totalDays = soldWithDates.reduce((sum, p) => {
                const created = typeof p.createdAt === 'number' ? p.createdAt : new Date(p.createdAt!).getTime();
                const sold = typeof p.soldAt === 'number' ? p.soldAt : new Date(p.soldAt!).getTime();
                const days = Math.max(1, Math.round((sold - created) / (1000 * 60 * 60 * 24)));
                return sum + days;
            }, 0);
            avgDaysToSell = Math.round(totalDays / soldWithDates.length);
        }

        return {
            avgPrice,
            avgDaysToSell,
            totalSold: soldProperties.length || (agent.propertiesSold || 0),
            totalActive: activeListings.length,
            totalRented: rentedProperties.length,
            priceRange,
            hasRealSalesData,
        };
    }, [allAgentProperties, soldProperties, activeListings.length, rentedProperties.length, agent.averageprice, agent.propertiesSold]);

    const firstName = agent.name?.split(' ')[0] || 'Agent';
    const canWriteReview = currentUser && currentUser.id !== agentUserId;

    // Get header gradient - use agency's gradient or default blue
    const headerGradient = agencyGradient;

    // Check if agency has cover image
    const hasCoverImage: string | false = isAgencyAgent && agent.agencyCoverImage
        ? agent.agencyCoverImage
        : false;

    // ─── Effects ─────────────────────────────────────────────────────────────

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (shareToastTimerRef.current) {
                clearTimeout(shareToastTimerRef.current);
            }
        };
    }, []);

    // Fetch fresh agent data from API on mount to ensure latest data is shown
    useEffect(() => {
        const fetchFreshAgentData = async () => {
            try {
                const agentIdentifier = agent.agentId || agent.id;
                if (!agentIdentifier) return;
                const freshAgent = await fetchAgentById(agentIdentifier);
                if (isMountedRef.current && freshAgent) {
                    setAgentData(prev => ({ ...prev, ...freshAgent }));
                }
            } catch {
                // Silently fail - we still have the prop data as fallback
            }
        };
        fetchFreshAgentData();
    }, [agent.id, agent.agentId]);

    // Scroll to top on mount - scroll the main content container
    useEffect(() => {
        // The main scroll container has id="main-content"
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
        // Also try window scroll as fallback
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [agent.id]);

    // Function to fetch agent's properties
    const fetchAgentProperties = useCallback(async () => {
        if (!isMountedRef.current) return;
        setLoadingProperties(true);
        try {
            // Try fetching with agent.userId first, then agent.id
            const userId = agent.userId || agent.id;
            if (userId) {
                const properties = await getPropertiesBySellerId(String(userId));
                if (isMountedRef.current) setFetchedProperties(properties);
            }
        } catch (error) {
            // Error removed
            // Don't clear - we still have state.properties as fallback
        } finally {
            if (isMountedRef.current) setLoadingProperties(false);
        }
    }, [agent.userId, agent.id]);

    // Fetch agent's properties from API on mount
    useEffect(() => {
        fetchAgentProperties();
    }, [fetchAgentProperties]);

    // Enable real-time updates - refresh agent's listings when properties change
    useRealtimeProperties({
        onPropertyCreated: () => {
            // Refresh agent's listings when a new property is created
            fetchAgentProperties();
        },
        onPropertyUpdated: () => {
            // Refresh agent's listings when a property is updated
            fetchAgentProperties();
        },
        onPropertyDeleted: () => {
            // Refresh agent's listings when a property is deleted
            fetchAgentProperties();
        },
    });

    // Fetch similar agents from same agency or city and fetch agency gradient
    useEffect(() => {
        let cancelled = false;
        const fetchSimilarAgents = async () => {
            if (cancelled) return;
            setLoadingSimilarAgents(true);
            try {
                if (isAgencyAgent && agent.agencyId) {
                    // Fetch agents from same agency and fetch agency gradient
                    const response = await getAgencyAgents(agent.agencyId);
                    if (cancelled) return;
                    const agencyAgents = (response.agents || [])
                        .filter((a: Agent) => a.id !== agent.id && a.userId !== agent.userId)
                        .slice(0, 4);
                    setSimilarAgents(agencyAgents);

                    // Fetch agency details
                    try {
                        const agencyResponse = await fetch(`${API_URL}/agencies/${agent.agencyId}`, {
                            credentials: 'include',
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        });
                        if (cancelled) return;
                        // Silently skip non-200 responses for agency data (optional)
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
                        // Silently fail - agency details are optional
                    }
                } else {
                    // Fetch agents from same city
                    const response = await getAllAgents();
                    if (cancelled) return;
                    const cityAgents = (response.agents || [])
                        .filter((a: Agent) =>
                            (a.id !== agent.id && a.userId !== agent.userId) &&
                            (a.city === agent.city || a.country === agent.country)
                        )
                        .slice(0, 4);
                    setSimilarAgents(cityAgents);
                }
            } catch (error) {
                // Error removed
            } finally {
                if (!cancelled) setLoadingSimilarAgents(false);
            }
        };

        fetchSimilarAgents();
        return () => { cancelled = true; };
    }, [agent.id, agent.agencyId, agent.city, agent.country, isAgencyAgent]);

    // Check if agent is saved on mount
    useEffect(() => {
        const checkIfSaved = async () => {
            if (!state.isAuthenticated || !agent.id) return;
            try {
                const response = await checkSavedAgent(agent.id);
                if (isMountedRef.current) {
                    setSavedAgent(response.isSaved);
                }
            } catch (error) {
                // Silently fail - default to not saved
                if (isMountedRef.current) {
                    setSavedAgent(false);
                }
            }
        };
        checkIfSaved();
    }, [agent.id, state.isAuthenticated]);

    // Fetch agent achievements
    useEffect(() => {
        const fetchAchievements = async () => {
            const userId = agent.userId || agent.id;
            if (!userId) return;
            try {
                const achievements = await getUserAchievements(userId);
                if (isMountedRef.current) {
                    setAgentAchievements(achievements);
                }
            } catch (error) {
                // Error handling is done at API layer - silent fail
                if (isMountedRef.current) {
                    setAgentAchievements([]);
                }
            }
        };
        fetchAchievements();
    }, [agent.id, agent.userId]);

    // Fetch agent credentials
    useEffect(() => {
        const fetchCredentials = async () => {
            try {
                if (isOwner) {
                    const creds = await getCredentials();
                    if (isMountedRef.current) {
                        setAgentCredentials(creds);
                    }
                } else {
                    const agentId = agent.userId || agent.id;
                    if (agentId) {
                        const creds = await getAgentPublicCredentials(String(agentId));
                        if (isMountedRef.current) {
                            setAgentCredentials(creds);
                        }
                    }
                }
            } catch (error) {
                // Error handling is done at API layer - silent fail
                if (isMountedRef.current) {
                    setAgentCredentials([]);
                }
            }
        };
        fetchCredentials();
    }, [agent.id, agent.userId, isOwner]);

    // ─── Handlers ────────────────────────────────────────────────────────────

    const handleBack = () => {
        dispatch({ type: 'SET_SELECTED_AGENT', payload: null });
        window.history.pushState({}, '', '/agents');
    };

    const handleSaveAgent = async () => {
        if (!state.isAuthenticated) {
            dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
            return;
        }
        const previousState = savedAgent;
        try {
            // Optimistic update
            setSavedAgent(!savedAgent);
            // Save to backend
            const response = await toggleSavedAgent(agent.id);
            // Sync with backend response
            setSavedAgent(response.isSaved);
            success(
                response.isSaved
                    ? t('profilePage.agentSaved', 'Agent saved!')
                    : t('profilePage.agentUnsaved', 'Agent removed from saved'),
                ''
            );
        } catch (err: any) {
            // Revert on error
            setSavedAgent(previousState);
            showError(t('profilePage.saveError', 'Failed to save agent'), err?.message || t('profilePage.saveErrorMessage', 'Please try again.'));
        }
    };

    const handleShareAgent = useCallback(async () => {
        const shareUrl = window.location.href;
        const shareData = {
            title: `${agent.name} - Real Estate Agent`,
            text: `Check out ${agent.name}, a real estate agent${isAgencyAgent ? ` at ${agent.agencyName}` : ''} on BalkanEstate`,
            url: shareUrl,
        };

        // Clear any existing timer
        if (shareToastTimerRef.current) {
            clearTimeout(shareToastTimerRef.current);
        }

        try {
            if (navigator.share && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareUrl);
                setShowShareToast(true);
                shareToastTimerRef.current = setTimeout(() => setShowShareToast(false), 3000);
            }
        } catch (error) {
            await navigator.clipboard.writeText(shareUrl);
            setShowShareToast(true);
            shareToastTimerRef.current = setTimeout(() => setShowShareToast(false), 3000);
        }
    }, [agent.name, agent.agencyName, isAgencyAgent]);

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
            // Error removed
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
            // Try userId (User ObjectId), then agentId (custom string), then agent id (Agent ObjectId)
            const sellerId = String(agent.userId || agent.agentId || agent.id || '');
            if (!sellerId) {
                throw new Error('Unable to identify agent');
            }
            const conversation = await createConversation({ sellerId });
            const messageText = `Property Appraisal Request:\n\nAddress: ${appraisalForm.address}\nProperty Type: ${appraisalForm.propertyType}\nNotes: ${appraisalForm.notes || 'No additional notes'}`;

            // Actually send the message to the conversation
            await sendMessage(conversation.id, { text: messageText });

            // Redirect to inbox
            dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation.id });
            window.history.pushState({ page: 'inbox' }, '', '/inbox');
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'inbox' });
            setShowAppraisalModal(false);
            setAppraisalForm({ address: '', propertyType: '', notes: '' });
        } catch (error) {
            // Error removed
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
            // Try userId (User ObjectId), then agentId (custom string), then agent id (Agent ObjectId)
            const sellerId = String(agent.userId || agent.agentId || agent.id || '');
            if (!sellerId) {
                throw new Error('Unable to identify agent');
            }
            const conversation = await createConversation({ sellerId });
            const messageText = `Consultation Request:\n\nPreferred Date: ${consultationForm.date}\nPreferred Time: ${consultationForm.time}\nTopic: ${consultationForm.topic}\nNotes: ${consultationForm.notes || 'No additional notes'}`;

            // Actually send the message to the conversation
            await sendMessage(conversation.id, { text: messageText });

            dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversation.id });
            window.history.pushState({ page: 'inbox' }, '', '/inbox');
            dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'inbox' });
            setShowConsultationModal(false);
            setConsultationForm({ date: '', time: '', topic: '', notes: '' });
        } catch (error) {
            // Error removed
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestMarketReport = () => {
        setShowMarketReportModal(true);
    };

    const handleMarketReportContact = () => {
        setShowMarketReportModal(false);
        setShowInquiryModal(true);
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const agentIdentifier = selectedAgent.agentId || selectedAgent.id;
        dispatch({ type: 'SET_SELECTED_AGENT', payload: agentIdentifier });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agents' });
        window.history.pushState({}, '', `/agents/${agentIdentifier}`);
    };

    const handleAgencyClick = async () => {
        if (!agent.agencyId) return;

        try {
            const response = await fetch(`${API_URL}/agencies/${agent.agencyId}`);
            if (response.ok) {
                const data = await response.json();
                dispatch({ type: 'SET_SELECTED_AGENCY', payload: data.agency });
                dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencyDetail' });
                const urlSlug = data.agency.slug || data.agency._id;
                window.history.pushState({}, '', `/agencies/${urlSlug}`);
            }
        } catch (error) {
            // Error removed
        }
    };

    // Handle opening edit modal
    const handleOpenEditModal = () => {
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
    };

    // Validate URL format
    const isValidUrl = (url: string): boolean => {
        if (!url || !url.trim()) return true; // Empty is valid (optional)
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    // Handle saving profile changes
    const handleSaveProfile = async (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();

        // Frontend validation
        if (editForm.bio && editForm.bio.length > 5000) {
            await showError(t('common:error', 'Error'), t('profilePage.editModal.bioTooLong', 'Bio must be under 5000 characters'));
            return;
        }

        const urlFields = [
            { name: t('profilePage.editModal.website', 'Website'), value: editForm.websiteUrl },
            { name: 'Facebook', value: editForm.facebookUrl },
            { name: 'Instagram', value: editForm.instagramUrl },
            { name: 'LinkedIn', value: editForm.linkedinUrl },
        ];
        for (const { name, value } of urlFields) {
            if (!isValidUrl(value)) {
                await showError(t('common:error', 'Error'), t('profilePage.editModal.invalidUrl', `Invalid URL for {{field}}. Please include https://`, { field: name }));
                return;
            }
        }

        setIsSavingProfile(true);
        try {
            // Sanitize data before sending
            const sanitizedForm = {
                ...editForm,
                bio: editForm.bio.trim(),
                specializations: editForm.specializations.filter(s => s.trim()),
                languages: editForm.languages.filter(l => l.trim()),
                serviceAreas: editForm.serviceAreas.filter(a => a.trim()),
                websiteUrl: editForm.websiteUrl.trim(),
                facebookUrl: editForm.facebookUrl.trim(),
                instagramUrl: editForm.instagramUrl.trim(),
                linkedinUrl: editForm.linkedinUrl.trim(),
                officeAddress: editForm.officeAddress.trim(),
                officePhone: editForm.officePhone.trim(),
            };
            const updatedAgent = await updateAgentProfile(sanitizedForm);
            setAgentData({ ...agentData, ...updatedAgent });
            setIsEditModalOpen(false);
            await success(
                t('profilePage.editModal.savedTitle', 'Profile Updated'),
                t('profilePage.editModal.savedMessage', 'Your profile has been updated successfully')
            );
        } catch (err) {
            await showError(
                t('common:error', 'Error'),
                err instanceof Error ? err.message : t('profilePage.editModal.saveFailed', 'Failed to save profile. Please try again.')
            );
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Handle adding item to array field
    const handleAddArrayItem = (field: 'specializations' | 'languages' | 'serviceAreas', value: string) => {
        if (value.trim() && !editForm[field].includes(value.trim())) {
            setEditForm(prev => ({
                ...prev,
                [field]: [...prev[field], value.trim()]
            }));
        }
    };

    // Handle removing item from array field
    const handleRemoveArrayItem = (field: 'specializations' | 'languages' | 'serviceAreas', index: number) => {
        setEditForm(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    // Achievement handlers for agents
    const handleAddAchievement = async (achievement: Omit<Achievement, 'id' | 'createdAt' | 'isVerified'>) => {
        try {
            const newAchievement = await addUserAchievement({
                type: achievement.type,
                title: achievement.title,
                description: achievement.description,
                dateReceived: achievement.dateReceived,
                expiryDate: achievement.expiryDate,
                issuingOrganization: achievement.issuingOrganization,
                documentUrl: achievement.documentUrl,
            });
            setAgentAchievements(prev => [...prev, newAchievement]);
            await success(t('achievements.addedTitle', 'Achievement Added'), t('achievements.addedMessage', 'The achievement has been added successfully'));
        } catch (err) {
            await showError(t('common:error', 'Error'), err instanceof Error ? err.message : t('achievements.addFailed', 'Failed to add achievement'));
            throw err;
        }
    };

    const handleEditAchievement = async (id: string, achievement: Partial<Achievement>) => {
        try {
            const updated = await updateUserAchievement(id, {
                type: achievement.type,
                title: achievement.title,
                description: achievement.description,
                dateReceived: achievement.dateReceived,
                expiryDate: achievement.expiryDate,
                issuingOrganization: achievement.issuingOrganization,
                documentUrl: achievement.documentUrl,
            });
            setAgentAchievements(prev => prev.map(a => a.id === id ? updated : a));
            await success(t('achievements.updatedTitle', 'Achievement Updated'), t('achievements.updatedMessage', 'The achievement has been updated successfully'));
        } catch (err) {
            await showError(t('common:error', 'Error'), err instanceof Error ? err.message : t('achievements.updateFailed', 'Failed to update achievement'));
            throw err;
        }
    };

    const handleDeleteAchievement = async (id: string) => {
        try {
            await deleteUserAchievement(id);
            setAgentAchievements(prev => prev.filter(a => a.id !== id));
            await success(t('achievements.deletedTitle', 'Achievement Deleted'), t('achievements.deletedMessage', 'The achievement has been deleted'));
        } catch (err) {
            await showError(t('common:error', 'Error'), err instanceof Error ? err.message : t('achievements.deleteFailed', 'Failed to delete achievement'));
            throw err;
        }
    };

    // Handler for viewing a property from the map popup
    const handleViewProperty = useCallback((propertyId: string) => {
        dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
        window.history.pushState({}, '', buildLocalizedPath(`/property/${propertyId}`));
        window.dispatchEvent(new PopStateEvent('popstate'));
    }, [dispatch]);

    // Refresh agent data after license submission
    const handleLicenseSubmitted = useCallback(async () => {
        try {
            const agentIdentifier = agentData.agentId || agentData.id;
            if (!agentIdentifier) return;
            const freshAgent = await fetchAgentById(agentIdentifier);
            if (isMountedRef.current && freshAgent) {
                setAgentData(prev => ({ ...prev, ...freshAgent }));
            }
        } catch {
            // Silently fail — existing data remains as fallback
        }
    }, [agentData.agentId, agentData.id]);

    // ─── Return ──────────────────────────────────────────────────────────────

    return {
        // Context
        dispatch,
        currentUser,
        isLoadingProperties,

        // Agent data
        agentData,

        // State
        activeTab, setActiveTab,
        showReviewForm, setShowReviewForm,
        savedAgent,
        showShareToast,
        similarAgents,
        loadingSimilarAgents,
        showAppraisalModal, setShowAppraisalModal,
        showConsultationModal, setShowConsultationModal,
        showMarketReportModal, setShowMarketReportModal,
        showInquiryModal, setShowInquiryModal,
        appraisalForm, setAppraisalForm,
        consultationForm, setConsultationForm,
        isSubmitting,
        agencyGradient,
        mapCardOpen, setMapCardOpen,
        agencyData,
        isEditModalOpen, setIsEditModalOpen,
        isSavingProfile,
        agentAchievements,
        agentCredentials, setAgentCredentials,
        loadingProperties,
        editForm, setEditForm,

        // Computed
        isAgencyAgent,
        hasValidCoordinates,
        allAgentProperties,
        activeListings,
        soldProperties,
        rentedProperties,
        stats,
        marketInsights,
        firstName,
        canWriteReview,
        isOwner,
        agentUserId,
        headerGradient,
        hasCoverImage,

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
        handleMarketReportContact,
        handleSearchAllProperties,
        handleVisitAgency,
        handleViewMoreAgents,
        handleSelectSimilarAgent,
        handleAgencyClick,
        handleOpenEditModal,
        handleSaveProfile,
        handleAddArrayItem,
        handleRemoveArrayItem,
        handleAddAchievement,
        handleEditAchievement,
        handleDeleteAchievement,
        handleViewProperty,
        handleLicenseSubmitted,
    };
}

export type UseAgentProfileReturn = ReturnType<typeof useAgentProfile>;

/**
 * useAgentProfile Hook
 *
 * Manages state and logic for the AgentProfilePage component.
 * Extracts complex state management to keep the component focused on rendering.
 */
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Agent, Agency, Achievement } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { useNotification } from '@/shared/hooks/useNotification';
import { fetchAgentByIdDirectly, fetchAgencyById, updateAgentProfile } from '../api/agentApi';
import { fetchAgentProperties } from '@/utils/api';
import { useRealtimeProperties } from '@/features/properties/hooks/useRealtimeProperties';

interface EditForm {
  bio: string;
  specializations: string[];
  languages: string[];
  serviceAreas: string[];
  phone: string;
  email: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  officeAddress: string;
  officePhone: string;
}

interface AppraisalForm {
  address: string;
  propertyType: string;
  notes: string;
}

interface ConsultationForm {
  date: string;
  time: string;
  topic: string;
  notes: string;
}

export interface AgentProfileState {
  // UI State
  activeTab: 'overview' | 'listings' | 'reviews';
  showReviewForm: boolean;
  savedAgent: boolean;
  showShareToast: boolean;
  showAppraisalModal: boolean;
  showConsultationModal: boolean;
  showInquiryModal: boolean;
  mapCardOpen: boolean;
  isEditModalOpen: boolean;
  isSavingProfile: boolean;
  isSubmitting: boolean;
  loadingProperties: boolean;
  loadingSimilarAgents: boolean;

  // Data State
  agentData: Agent;
  agencyData: Agency | null;
  agentAchievements: Achievement[];
  fetchedProperties: any[];
  similarAgents: Agent[];
  agencyGradient: string;

  // Forms
  editForm: EditForm;
  appraisalForm: AppraisalForm;
  consultationForm: ConsultationForm;
}

export interface AgentProfileActions {
  setActiveTab: (tab: 'overview' | 'listings' | 'reviews') => void;
  setShowReviewForm: (show: boolean) => void;
  setSavedAgent: (saved: boolean) => void;
  setShowShareToast: (show: boolean) => void;
  setShowAppraisalModal: (show: boolean) => void;
  setShowConsultationModal: (show: boolean) => void;
  setShowInquiryModal: (show: boolean) => void;
  setMapCardOpen: (open: boolean) => void;
  setIsEditModalOpen: (open: boolean) => void;
  setEditForm: (form: EditForm | ((prev: EditForm) => EditForm)) => void;
  setAppraisalForm: (form: AppraisalForm | ((prev: AppraisalForm) => AppraisalForm)) => void;
  setConsultationForm: (form: ConsultationForm | ((prev: ConsultationForm) => ConsultationForm)) => void;
  handleShareAgent: () => Promise<void>;
  handleContactAgent: () => void;
  handleSaveProfile: () => Promise<void>;
  handleAddArrayItem: (field: 'specializations' | 'languages' | 'serviceAreas', value: string) => void;
  handleRemoveArrayItem: (field: 'specializations' | 'languages' | 'serviceAreas', index: number) => void;
  refetchAgentProperties: () => void;
}

export function useAgentProfile(agent: Agent) {
  const { t } = useTranslation(['agents']);
  const { state, dispatch, createConversation } = useAppContext();
  const { currentUser } = state;
  const { success, error: showError } = useNotification();
  const shareToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'reviews'>('overview');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [savedAgent, setSavedAgent] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showAppraisalModal, setShowAppraisalModal] = useState(false);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [mapCardOpen, setMapCardOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingSimilarAgents, setLoadingSimilarAgents] = useState(false);

  // Data State
  const [agentData, setAgentData] = useState(agent);
  const [agencyData, setAgencyData] = useState<Agency | null>(null);
  const [agentAchievements, setAgentAchievements] = useState<Achievement[]>([]);
  const [fetchedProperties, setFetchedProperties] = useState<any[]>([]);
  const [similarAgents, setSimilarAgents] = useState<Agent[]>([]);
  const [agencyGradient, setAgencyGradient] = useState<string>('bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-900');

  // Forms
  const [editForm, setEditForm] = useState<EditForm>({
    bio: agent.bio || '',
    specializations: agent.specializations || [],
    languages: agent.languages || [],
    serviceAreas: agent.serviceAreas || [],
    phone: agent.phone || '',
    email: agent.email || '',
    facebookUrl: agent.facebookUrl || '',
    instagramUrl: agent.instagramUrl || '',
    linkedinUrl: agent.linkedinUrl || '',
    officeAddress: agent.officeAddress || '',
    officePhone: agent.officePhone || '',
  });

  const [appraisalForm, setAppraisalForm] = useState<AppraisalForm>({
    address: '',
    propertyType: '',
    notes: '',
  });

  const [consultationForm, setConsultationForm] = useState<ConsultationForm>({
    date: '',
    time: '',
    topic: '',
    notes: '',
  });

  // Computed values
  const isAgencyAgent = agent.agencyName && agent.agencyName !== 'Independent Agent';
  const agentUserId = agent.userId || agent.id;

  const isOwner = currentUser && (
    String(currentUser.id) === String(agent.userId) ||
    String(currentUser._id) === String(agent.userId) ||
    String(currentUser.id) === String(agent.id) ||
    String(currentUser._id) === String(agent.id)
  );

  // Validate coordinates for map display
  const hasValidCoordinates = useMemo(() => {
    if (agent.lat == null || agent.lng == null) return false;
    if (isNaN(agent.lat) || isNaN(agent.lng)) return false;
    if (agent.lat === 0 && agent.lng === 0) return false;
    const isInBalkans = agent.lat >= 35 && agent.lat <= 47 && agent.lng >= 13 && agent.lng <= 31;
    return isInBalkans;
  }, [agent.lat, agent.lng]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (shareToastTimerRef.current) {
        clearTimeout(shareToastTimerRef.current);
      }
    };
  }, []);

  // Combine fetched properties with state properties
  const allAgentProperties = useMemo(() => {
    const stateProperties = state.properties.filter(p =>
      String(p.sellerId) === String(agentUserId) ||
      String(p.agentId) === String(agent.id)
    );

    const combinedMap = new Map();
    [...stateProperties, ...fetchedProperties].forEach(p => {
      if (!combinedMap.has(p.id) || p.updatedAt > combinedMap.get(p.id).updatedAt) {
        combinedMap.set(p.id, p);
      }
    });

    return Array.from(combinedMap.values());
  }, [state.properties, fetchedProperties, agentUserId, agent.id]);

  const activeListings = allAgentProperties.filter(p => p.status === 'active');
  const soldProperties = allAgentProperties.filter(p => p.status === 'sold');

  // Stats calculation
  const stats = useMemo(() => ({
    listings: activeListings.length,
    sold: soldProperties.length,
    reviews: agent.testimonials?.length || 0,
    yearsExperience: agent.yearsOfExperience || Math.floor(Math.random() * 10) + 2,
  }), [activeListings.length, soldProperties.length, agent.testimonials, agent.yearsOfExperience]);

  // Fetch agent properties
  const fetchAgentPropertiesData = useCallback(async () => {
    if (!agentUserId) return;
    setLoadingProperties(true);
    try {
      const response = await fetchAgentProperties(agentUserId);
      if (response && Array.isArray(response)) {
        setFetchedProperties(response);
      }
    } catch {
      // Silently handle error
    } finally {
      setLoadingProperties(false);
    }
  }, [agentUserId]);

  // Initial fetch
  useEffect(() => {
    fetchAgentPropertiesData();
  }, [fetchAgentPropertiesData]);

  // Enable real-time updates
  useRealtimeProperties({
    onPropertyCreated: () => fetchAgentPropertiesData(),
    onPropertyUpdated: () => fetchAgentPropertiesData(),
    onPropertyDeleted: () => fetchAgentPropertiesData(),
  });

  // Fetch agency data if agent belongs to agency
  useEffect(() => {
    const fetchAgency = async () => {
      if (isAgencyAgent && agent.agencyId) {
        try {
          const agency = await fetchAgencyById(agent.agencyId);
          setAgencyData(agency);
          if (agency?.brandColor) {
            setAgencyGradient(`bg-gradient-to-r from-[${agency.brandColor}] via-[${agency.brandColor}] to-[${agency.brandColor}]`);
          }
        } catch {
          // Silently handle error
        }
      }
    };
    fetchAgency();
  }, [isAgencyAgent, agent.agencyId]);

  // Actions
  const handleShareAgent = useCallback(async () => {
    const shareUrl = `${window.location.origin}/agent/${agent.id}`;
    const shareText = `Check out ${agent.name} - Real Estate Agent on BalkanEstate`;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, url: shareUrl });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setShowShareToast(true);
      shareToastTimerRef.current = setTimeout(() => setShowShareToast(false), 3000);
    }
  }, [agent.id, agent.name]);

  const handleContactAgent = useCallback(async () => {
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }

    if (!agentUserId) {
      showError(t('profilePage.contactError', 'Unable to contact agent'));
      return;
    }

    try {
      const conversationId = await createConversation({
        recipientId: agentUserId,
        agentId: agent.id,
      });
      dispatch({ type: 'SET_ACTIVE_CONVERSATION_ID', payload: conversationId });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'inbox' });
    } catch {
      showError(t('profilePage.contactError', 'Failed to start conversation'));
    }
  }, [state.isAuthenticated, dispatch, agentUserId, agent.id, createConversation, showError, t]);

  const handleSaveProfile = useCallback(async () => {
    setIsSavingProfile(true);
    try {
      const updatedAgent = await updateAgentProfile(agent.id, editForm);
      setAgentData(prev => ({ ...prev, ...updatedAgent }));
      setIsEditModalOpen(false);
      success(t('profilePage.editModal.saveSuccess', 'Profile updated successfully'));
    } catch {
      showError(t('profilePage.editModal.saveError', 'Failed to update profile'));
    } finally {
      setIsSavingProfile(false);
    }
  }, [agent.id, editForm, success, showError, t]);

  const handleAddArrayItem = useCallback((
    field: 'specializations' | 'languages' | 'serviceAreas',
    value: string
  ) => {
    if (!value.trim()) return;
    setEditForm(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()],
    }));
  }, []);

  const handleRemoveArrayItem = useCallback((
    field: 'specializations' | 'languages' | 'serviceAreas',
    index: number
  ) => {
    setEditForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  }, []);

  return {
    state: {
      activeTab,
      showReviewForm,
      savedAgent,
      showShareToast,
      showAppraisalModal,
      showConsultationModal,
      showInquiryModal,
      mapCardOpen,
      isEditModalOpen,
      isSavingProfile,
      isSubmitting,
      loadingProperties,
      loadingSimilarAgents,
      agentData,
      agencyData,
      agentAchievements,
      fetchedProperties,
      similarAgents,
      agencyGradient,
      editForm,
      appraisalForm,
      consultationForm,
    },
    computed: {
      isAgencyAgent,
      agentUserId,
      isOwner,
      hasValidCoordinates,
      allAgentProperties,
      activeListings,
      soldProperties,
      stats,
    },
    actions: {
      setActiveTab,
      setShowReviewForm,
      setSavedAgent,
      setShowShareToast,
      setShowAppraisalModal,
      setShowConsultationModal,
      setShowInquiryModal,
      setMapCardOpen,
      setIsEditModalOpen,
      setEditForm,
      setAppraisalForm,
      setConsultationForm,
      handleShareAgent,
      handleContactAgent,
      handleSaveProfile,
      handleAddArrayItem,
      handleRemoveArrayItem,
      refetchAgentProperties: fetchAgentPropertiesData,
    },
  };
}

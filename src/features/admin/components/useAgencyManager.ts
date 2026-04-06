import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Agency } from '@/types';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { apiRequest } from '@/src/shared/api';
import {
  activateAgencySubscription,
  deactivateAgencySubscription,
} from '../api/adminApi';

export interface AgencyEditForm {
  name: string;
  description: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  zipCode: string;
  lat: number;
  lng: number;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
  yearsInBusiness: number;
  specialties: string[];
  certifications: string[];
  isFeatured: boolean;
  featuredStartDate: string;
  featuredEndDate: string;
  adRotationOrder: number;
  businessHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
}

const defaultEditForm: AgencyEditForm = {
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
  specialties: [],
  certifications: [],
  isFeatured: false,
  featuredStartDate: '',
  featuredEndDate: '',
  adRotationOrder: 0,
  businessHours: {
    monday: '',
    tuesday: '',
    wednesday: '',
    thursday: '',
    friday: '',
    saturday: '',
    sunday: '',
  },
};

export function useAgencyManager() {
  const { t } = useTranslation(['admin']);
  const { confirm } = useConfirmation();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // View modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingAgency, setViewingAgency] = useState<Agency | null>(null);

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [editForm, setEditForm] = useState<AgencyEditForm>(defaultEditForm);

  // Subscription action loading
  const [subscriptionLoading, setSubscriptionLoading] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAgencies, setTotalAgencies] = useState(0);

  useEffect(() => {
    fetchAgencies();
  }, [currentPage]);

  const fetchAgencies = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      const data = await apiRequest<any>(`/admin/agencies?${params}`, {
        requiresAuth: true,
      });
      setAgencies(data.agencies || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalAgencies(data.pagination?.totalItems || 0);
    } catch (err) {
      setError('Failed to load agencies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAgency = (agency: Agency) => {
    setViewingAgency(agency);
    setIsViewModalOpen(true);
  };

  const handleEditAgency = (agency: Agency) => {
    setEditingAgency(agency);
    setEditForm({
      name: agency.name,
      description: agency.description || '',
      website: agency.website || '',
      phone: agency.phone || '',
      email: agency.email || '',
      address: agency.address || '',
      city: agency.city || '',
      country: agency.country || '',
      zipCode: agency.zipCode || '',
      lat: agency.lat || 0,
      lng: agency.lng || 0,
      facebookUrl: agency.facebookUrl || '',
      instagramUrl: agency.instagramUrl || '',
      linkedinUrl: agency.linkedinUrl || '',
      twitterUrl: agency.twitterUrl || '',
      yearsInBusiness: agency.yearsInBusiness || 0,
      specialties: agency.specialties || [],
      certifications: agency.certifications || [],
      isFeatured: agency.isFeatured || false,
      featuredStartDate: agency.featuredStartDate ? agency.featuredStartDate.split('T')[0] : '',
      featuredEndDate: agency.featuredEndDate ? agency.featuredEndDate.split('T')[0] : '',
      adRotationOrder: agency.adRotationOrder || 0,
      businessHours: {
        monday: agency.businessHours?.monday || '',
        tuesday: agency.businessHours?.tuesday || '',
        wednesday: agency.businessHours?.wednesday || '',
        thursday: agency.businessHours?.thursday || '',
        friday: agency.businessHours?.friday || '',
        saturday: agency.businessHours?.saturday || '',
        sunday: agency.businessHours?.sunday || '',
      },
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgency) return;

    try {
      const sanitizedForm = {
        ...editForm,
        specialties: editForm.specialties.filter(s => s),
        certifications: editForm.certifications.filter(s => s),
      };

      await apiRequest(`/admin/agencies/${editingAgency._id}`, {
        method: 'PATCH',
        body: sanitizedForm,
        requiresAuth: true,
      });

      await fetchAgencies();
      setIsEditModalOpen(false);
      setEditingAgency(null);
      setSuccessMessage('Agency updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update agency');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteAgency = async (agencyId: string, name: string) => {
    const confirmed = await confirm({
      title: t('admin:agencies.deleteTitle', 'Delete Agency'),
      message: t('admin:agencies.deleteConfirm', { name, defaultValue: `Are you sure you want to delete "${name}"? This will remove the agency and unassign all agents. This action cannot be undone.` }),
      confirmLabel: t('admin:common.delete', 'Delete'),
      cancelLabel: t('admin:common.cancel', 'Cancel'),
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      await apiRequest(`/admin/agencies/${agencyId}`, {
        method: 'DELETE',
        requiresAuth: true,
      });

      await fetchAgencies();
      setSuccessMessage('Agency deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to delete agency');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleActivateSubscription = async (agencyId: string, agencyName: string) => {
    const confirmed = await confirm({
      title: t('admin:agencies.activateConfirmTitle', 'Activate Agency Subscription'),
      message: t('admin:agencies.activateConfirmMessage', {
        name: agencyName,
        defaultValue: `This will activate a 1-year subscription for "${agencyName}". The agency and its agents will regain full access.`,
      }),
      confirmLabel: t('admin:agencies.activateSubscription', 'Activate'),
      cancelLabel: t('admin:common.cancel', 'Cancel'),
      type: 'info',
    });
    if (!confirmed) return;

    try {
      setSubscriptionLoading(agencyId);
      await activateAgencySubscription(agencyId, { durationDays: 365 });
      await fetchAgencies();
      setSuccessMessage(t('admin:agencies.subscriptionActivated', 'Subscription activated successfully'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(t('admin:agencies.subscriptionActivateError', 'Failed to activate subscription'));
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubscriptionLoading(null);
    }
  };

  const handleDeactivateSubscription = async (agencyId: string, agencyName: string) => {
    const confirmed = await confirm({
      title: t('admin:agencies.deactivateConfirmTitle', 'Deactivate Agency Subscription'),
      message: t('admin:agencies.deactivateConfirmMessage', {
        name: agencyName,
        defaultValue: `This will immediately deactivate the subscription for "${agencyName}". The agency will lose access to premium features.`,
      }),
      confirmLabel: t('admin:agencies.deactivateSubscription', 'Deactivate'),
      cancelLabel: t('admin:common.cancel', 'Cancel'),
      type: 'danger',
    });
    if (!confirmed) return;

    try {
      setSubscriptionLoading(agencyId);
      await deactivateAgencySubscription(agencyId, { immediate: true });
      await fetchAgencies();
      setSuccessMessage(t('admin:agencies.subscriptionDeactivated', 'Subscription deactivated successfully'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(t('admin:agencies.subscriptionDeactivateError', 'Failed to deactivate subscription'));
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubscriptionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return {
    agencies,
    isLoading,
    error,
    successMessage,
    isViewModalOpen,
    setIsViewModalOpen,
    viewingAgency,
    isEditModalOpen,
    setIsEditModalOpen,
    editingAgency,
    editForm,
    setEditForm,
    currentPage,
    setCurrentPage,
    totalPages,
    totalAgencies,
    handleViewAgency,
    handleEditAgency,
    handleUpdateAgency,
    handleDeleteAgency,
    handleActivateSubscription,
    handleDeactivateSubscription,
    subscriptionLoading,
    formatDate,
  };
}

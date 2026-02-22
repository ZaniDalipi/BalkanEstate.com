import { useState, useMemo } from 'react';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import {
  useEmailConfigs,
  useUpdateEmailConfig,
  useToggleEmailStatus,
  useResetEmailConfig,
  useResetAllEmailConfigs,
  useSendTestEmail,
  usePreviewEmail,
  EmailConfig,
} from '../hooks/useEmailConfigData';

export type { EmailConfig };

export function useEmailManager() {
  const notification = useNotification();
  const showNotification = (opts: { type?: string; message: string; title?: string }) =>
    notification.notify({ title: opts.title || (opts.type === 'error' ? 'Error' : 'Success'), message: opts.message, type: opts.type as any });
  const { confirm } = useConfirmation();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEmail, setSelectedEmail] = useState<EmailConfig | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [testEmail, setTestEmail] = useState('');

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<EmailConfig>>({});

  // React Query hooks
  const {
    data: emailData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useEmailConfigs({
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    isActive: selectedStatus !== 'all' ? selectedStatus : undefined,
    search: searchQuery || undefined,
  });

  const updateMutation = useUpdateEmailConfig();
  const toggleMutation = useToggleEmailStatus();
  const resetMutation = useResetEmailConfig();
  const resetAllMutation = useResetAllEmailConfigs();
  const sendTestMutation = useSendTestEmail();
  const previewMutation = usePreviewEmail();

  const emails = emailData?.configs || [];
  const categoryStats = emailData?.categoryStats || {};

  const filteredEmails = useMemo(() => {
    return emails;
  }, [emails]);

  const groupedEmails = useMemo(() => {
    const groups: Record<string, EmailConfig[]> = {};
    filteredEmails.forEach((email) => {
      if (!groups[email.category]) {
        groups[email.category] = [];
      }
      groups[email.category].push(email);
    });
    return groups;
  }, [filteredEmails]);

  // Handlers
  const handleOpenEdit = (email: EmailConfig) => {
    setSelectedEmail(email);
    setEditForm({
      subject: email.subject,
      preheaderText: email.preheaderText,
      headerTitle: email.headerTitle,
      headerSubtitle: email.headerSubtitle,
      headerEmoji: email.headerEmoji,
      headerGradient: email.headerGradient,
      bodyTemplate: email.bodyTemplate,
      ctaEnabled: email.ctaEnabled,
      ctaText: email.ctaText,
      ctaUrl: email.ctaUrl,
      showUnsubscribe: email.showUnsubscribe,
      footerReason: email.footerReason,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedEmail) return;

    try {
      await updateMutation.mutateAsync({
        key: selectedEmail.key,
        data: editForm,
      });
      showNotification({
        type: 'success',
        message: 'Email configuration updated successfully',
      });
      setIsEditModalOpen(false);
      setSelectedEmail(null);
    } catch (err: any) {
      showNotification({
        type: 'error',
        message: err.message || 'Failed to update email configuration',
      });
    }
  };

  const handleToggleStatus = async (email: EmailConfig) => {
    const action = email.isActive ? 'disable' : 'enable';
    const confirmed = await confirm({
      title: `${email.isActive ? 'Disable' : 'Enable'} Email`,
      message: `Are you sure you want to ${action} "${email.name}"? ${
        email.isActive
          ? 'This will prevent the system from sending this type of email.'
          : 'This will allow the system to send this type of email.'
      }`,
      confirmLabel: email.isActive ? 'Disable' : 'Enable',
      type: email.isActive ? 'danger' : 'info',
    });

    if (!confirmed) return;

    try {
      await toggleMutation.mutateAsync(email.key);
      showNotification({
        title: 'Success',
        type: 'success',
        message: `Email ${action}d successfully`,
      });
    } catch (err: any) {
      showNotification({
        title: 'Error',
        type: 'error',
        message: err.message || `Failed to ${action} email`,
      });
    }
  };

  const handleReset = async (email: EmailConfig) => {
    const confirmed = await confirm({
      title: 'Reset to Default',
      message: `Are you sure you want to reset "${email.name}" to its default configuration? This will overwrite any customizations you've made.`,
      confirmLabel: 'Reset',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await resetMutation.mutateAsync(email.key);
      showNotification({
        type: 'success',
        message: 'Email reset to default successfully',
      });
    } catch (err: any) {
      showNotification({
        type: 'error',
        message: err.message || 'Failed to reset email',
      });
    }
  };

  const handleResetAll = async () => {
    const confirmed = await confirm({
      title: 'Reset All Emails',
      message:
        'Are you sure you want to reset ALL email configurations to their defaults? This will overwrite any customizations you\'ve made to any emails.',
      confirmLabel: 'Reset All',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await resetAllMutation.mutateAsync();
      showNotification({
        type: 'success',
        message: 'All emails reset to defaults successfully',
      });
    } catch (err: any) {
      showNotification({
        type: 'error',
        message: err.message || 'Failed to reset emails',
      });
    }
  };

  const handlePreview = async (email: EmailConfig) => {
    setSelectedEmail(email);
    try {
      const result = await previewMutation.mutateAsync({
        key: email.key,
      });
      setPreviewHtml(result.html);
      setPreviewSubject(result.subject);
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      showNotification({
        type: 'error',
        message: err.message || 'Failed to generate preview',
      });
    }
  };

  const handleOpenTestModal = (email: EmailConfig) => {
    setSelectedEmail(email);
    setTestEmail('');
    setIsTestModalOpen(true);
  };

  const handleSendTest = async () => {
    if (!selectedEmail || !testEmail) return;

    try {
      await sendTestMutation.mutateAsync({
        key: selectedEmail.key,
        testEmail,
      });
      showNotification({
        type: 'success',
        message: `Test email sent to ${testEmail}`,
      });
      setIsTestModalOpen(false);
      setSelectedEmail(null);
    } catch (err: any) {
      showNotification({
        type: 'error',
        message: err.message || 'Failed to send test email',
      });
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedStatus,
    setSelectedStatus,
    selectedEmail,
    setSelectedEmail,
    isEditModalOpen,
    setIsEditModalOpen,
    isPreviewModalOpen,
    setIsPreviewModalOpen,
    isTestModalOpen,
    setIsTestModalOpen,
    previewHtml,
    setPreviewHtml,
    previewSubject,
    testEmail,
    setTestEmail,
    editForm,
    setEditForm,
    isLoading,
    error,
    refetch,
    isRefetching,
    updateMutation,
    toggleMutation,
    resetMutation,
    resetAllMutation,
    sendTestMutation,
    previewMutation,
    filteredEmails,
    groupedEmails,
    categoryStats,
    handleOpenEdit,
    handleSaveEdit,
    handleToggleStatus,
    handleReset,
    handleResetAll,
    handlePreview,
    handleOpenTestModal,
    handleSendTest,
  };
}

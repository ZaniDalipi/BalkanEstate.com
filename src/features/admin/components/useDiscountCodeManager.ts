import React, { useState, useMemo } from 'react';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import {
  useDiscountCodes,
  useCreateFullDiscountCode,
  useDeleteDiscountCode,
  useDeactivateDiscountCode,
  useBulkGenerateDiscountCodes,
} from '../hooks/useAdminData';

export interface DiscountCode {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  usedBy: string[];
  isActive: boolean;
  applicablePlans?: string[];
  minimumPurchaseAmount?: number;
  description?: string;
  source?: string;
  createdAt: string;
}

export interface NewCodeForm {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validUntil: string;
  usageLimit: number;
  description: string;
  applicablePlans: string[];
  minimumPurchaseAmount: number;
  source: string;
}

export interface BulkForm {
  count: number;
  prefix: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validUntil: string;
  usageLimit: number;
}

const defaultNewCode: NewCodeForm = {
  code: '',
  discountType: 'percentage',
  discountValue: 10,
  validUntil: '',
  usageLimit: 1,
  description: '',
  applicablePlans: [],
  minimumPurchaseAmount: 0,
  source: 'admin',
};

const defaultBulkForm: BulkForm = {
  count: 10,
  prefix: 'PROMO',
  discountType: 'percentage',
  discountValue: 10,
  validUntil: '',
  usageLimit: 1,
};

export function useDiscountCodeManager() {
  const { confirm } = useConfirmation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  // React Query hooks
  const { data: codesData, isLoading, error: queryError, isRefetching, refetch } = useDiscountCodes();
  const createCodeMutation = useCreateFullDiscountCode();
  const deleteCodeMutation = useDeleteDiscountCode();
  const deactivateCodeMutation = useDeactivateDiscountCode();
  const bulkGenerateMutation = useBulkGenerateDiscountCodes();

  const codes = codesData?.discountCodes || [];
  const error = queryError ? 'Failed to load discount codes' : localError;

  // Form state
  const [newCode, setNewCode] = useState<NewCodeForm>(defaultNewCode);
  const [bulkForm, setBulkForm] = useState<BulkForm>(defaultBulkForm);

  const handleNewCodeNumber = (field: keyof NewCodeForm, value: string, min: number = 0) => {
    const parsed = parseInt(value, 10);
    if (value === '' || isNaN(parsed)) {
      setNewCode({ ...newCode, [field]: min });
      return;
    }
    setNewCode({ ...newCode, [field]: Math.max(parsed, min) });
  };

  const handleBulkFormNumber = (field: keyof BulkForm, value: string, min: number = 0) => {
    const parsed = parseInt(value, 10);
    if (value === '' || isNaN(parsed)) {
      setBulkForm({ ...bulkForm, [field]: min });
      return;
    }
    setBulkForm({ ...bulkForm, [field]: Math.max(parsed, min) });
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    createCodeMutation.mutate(
      {
        ...newCode,
        code: newCode.code.toUpperCase(),
        validFrom: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          setIsCreateModalOpen(false);
          setSuccessMessage('Discount code created successfully!');
          setTimeout(() => setSuccessMessage(null), 3000);
          setNewCode(defaultNewCode);
        },
        onError: (err: any) => {
          setLocalError(err.message || 'Failed to create discount code');
          setTimeout(() => setLocalError(null), 5000);
        },
      }
    );
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    bulkGenerateMutation.mutate(
      {
        ...bulkForm,
        validFrom: new Date().toISOString(),
      },
      {
        onSuccess: (data) => {
          setIsBulkModalOpen(false);
          setSuccessMessage(`Successfully generated ${data.codes?.length || bulkForm.count} discount codes!`);
          setTimeout(() => setSuccessMessage(null), 3000);
        },
        onError: () => {
          setLocalError('Failed to generate discount codes');
          setTimeout(() => setLocalError(null), 5000);
        },
      }
    );
  };

  const handleDeactivate = async (id: string) => {
    const confirmed = await confirm({
      title: 'Deactivate Discount Code',
      message: 'Are you sure you want to deactivate this discount code?',
      confirmLabel: 'Deactivate',
      cancelLabel: 'Cancel',
      type: 'warning',
    });
    if (!confirmed) return;

    deactivateCodeMutation.mutate(id, {
      onSuccess: () => {
        setSuccessMessage('Discount code deactivated');
        setTimeout(() => setSuccessMessage(null), 3000);
      },
      onError: (err: any) => {
        const message = err?.message || 'Failed to deactivate discount code';
        setLocalError(message);
        setTimeout(() => setLocalError(null), 5000);
      },
    });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Discount Code',
      message: 'Are you sure you want to permanently delete this discount code?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      type: 'danger',
    });
    if (!confirmed) return;

    deleteCodeMutation.mutate(id, {
      onSuccess: () => {
        setSuccessMessage('Discount code deleted');
        setTimeout(() => setSuccessMessage(null), 3000);
      },
      onError: (err: any) => {
        const message = err?.message || 'Failed to delete discount code';
        setLocalError(message);
        setTimeout(() => setLocalError(null), 5000);
      },
    });
  };

  const openListingPromoCreate = () => {
    setNewCode({
      code: `PROMO${Date.now().toString().slice(-6)}`,
      discountType: 'percentage',
      discountValue: 20,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      usageLimit: 100,
      description: 'Listing promotion discount',
      applicablePlans: ['listing_promotion_15days'],
      minimumPurchaseAmount: 0,
      source: 'promotion',
    });
    setIsCreateModalOpen(true);
  };

  const filteredCodes = useMemo(() => codes.filter((code: DiscountCode) => {
    if (filterStatus === 'active' && !code.isActive) return false;
    if (filterStatus === 'inactive' && code.isActive) return false;
    if (filterSource !== 'all' && code.source !== filterSource) return false;
    return true;
  }), [codes, filterStatus, filterSource]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return {
    isCreateModalOpen,
    setIsCreateModalOpen,
    isBulkModalOpen,
    setIsBulkModalOpen,
    error,
    successMessage,
    filterStatus,
    setFilterStatus,
    filterSource,
    setFilterSource,
    isLoading,
    isRefetching,
    refetch,
    newCode,
    setNewCode,
    bulkForm,
    setBulkForm,
    filteredCodes,
    handleNewCodeNumber,
    handleBulkFormNumber,
    handleCreateCode,
    handleBulkGenerate,
    handleDeactivate,
    handleDelete,
    openListingPromoCreate,
    formatDate,
  };
}

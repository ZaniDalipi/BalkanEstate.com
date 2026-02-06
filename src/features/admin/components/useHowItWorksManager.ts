import { useState, useEffect, useRef } from 'react';
import { API_URL } from '@/src/shared/api/config';

export interface Step {
  stepNumber: number;
  title: string;
  description: string;
  icon?: string;
  duration?: string;
  tips?: string[];
}

export interface FAQ {
  question: string;
  answer: string;
  order: number;
}

export interface SiteContent {
  _id: string;
  key: string;
  type: 'video' | 'image';
  contentType: 'video' | 'guide' | 'faq' | 'feature';
  url: string;
  title: string;
  description?: string;
  section: string;
  subsection?: string;
  category?: string;
  order: number;
  isActive: boolean;
  steps?: Step[];
  faqs?: FAQ[];
  features?: string[];
  estimatedTime?: string;
  difficulty?: 'easy' | 'medium' | 'advanced';
  tags?: string[];
  createdAt: string;
}

export interface HowItWorksFormData {
  key: string;
  type: 'video' | 'image';
  contentType: 'video' | 'guide' | 'faq' | 'feature';
  url: string;
  title: string;
  description: string;
  subsection: string;
  category: string;
  order: number;
  steps: Step[];
  faqs: FAQ[];
  features: string[];
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  tags: string[];
}

export const SUBSECTIONS = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'premium-features', label: 'Premium Features' },
  { id: 'agencies', label: 'For Agencies' },
  { id: 'agents', label: 'For Agents' },
  { id: 'buyers', label: 'For Buyers' },
  { id: 'sellers', label: 'For Sellers' },
];

export const CATEGORIES = [
  { id: 'registration', label: 'Registration & Login' },
  { id: 'subscription', label: 'Subscriptions & Payments' },
  { id: 'listing-creation', label: 'Creating Listings' },
  { id: 'listing-promotion', label: 'Promoting Listings' },
  { id: 'agency-creation', label: 'Creating an Agency' },
  { id: 'agency-management', label: 'Managing Agency' },
  { id: 'become-agent', label: 'Becoming an Agent' },
  { id: 'agent-profile', label: 'Agent Profile' },
  { id: 'property-search', label: 'Searching Properties' },
  { id: 'saved-searches', label: 'Saved Searches & Alerts' },
  { id: 'messaging', label: 'Messaging & Inquiries' },
  { id: 'account-settings', label: 'Account Settings' },
  { id: 'general', label: 'General' },
];

export const CONTENT_TYPES = [
  { id: 'video', label: 'Video Tutorial', iconId: 'PlayCircleIcon' },
  { id: 'guide', label: 'Step-by-Step Guide', iconId: 'BookOpenIcon' },
  { id: 'faq', label: 'FAQ Section', iconId: 'QuestionMarkCircleIcon' },
  { id: 'feature', label: 'Feature Highlight', iconId: 'SparklesIcon' },
];

export const ICON_OPTIONS = [
  { id: 'user', label: 'User' },
  { id: 'building', label: 'Building' },
  { id: 'document', label: 'Document' },
  { id: 'credit-card', label: 'Credit Card' },
  { id: 'check', label: 'Check' },
  { id: 'search', label: 'Search' },
  { id: 'home', label: 'Home' },
  { id: 'star', label: 'Star' },
  { id: 'bell', label: 'Bell' },
  { id: 'chat', label: 'Chat' },
  { id: 'settings', label: 'Settings' },
  { id: 'upload', label: 'Upload' },
];

export function useHowItWorksManager() {
  const [content, setContent] = useState<SiteContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SiteContent | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'guide' | 'faq'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<HowItWorksFormData>({
    key: '',
    type: 'video',
    contentType: 'video',
    url: '',
    title: '',
    description: '',
    subsection: 'getting-started',
    category: 'general',
    order: 0,
    steps: [],
    faqs: [],
    features: [],
    estimatedTime: '',
    difficulty: 'easy',
    tags: [],
  });

  const fetchContent = async () => {
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/admin/site-content`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch content');
      const data = await response.json();
      setContent(data.filter((item: SiteContent) => item.section === 'how-it-works'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const formDataUpload = new FormData();
      formDataUpload.append('video', file);

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const response = await new Promise<any>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('POST', `${API_URL}/admin/site-content/upload-video`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formDataUpload);
      });

      setFormData((prev) => ({ ...prev, url: response.url }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const url = editingItem
        ? `${API_URL}/admin/site-content/${editingItem._id}`
        : `${API_URL}/admin/site-content`;

      // For guides, we don't need URL; set a placeholder
      const submitData = {
        ...formData,
        section: 'how-it-works',
        url: formData.contentType === 'guide' || formData.contentType === 'faq'
          ? 'placeholder'
          : formData.url,
      };

      const response = await fetch(url, {
        method: editingItem ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) throw new Error('Failed to save content');

      setShowModal(false);
      setEditingItem(null);
      resetForm();
      fetchContent();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      key: '',
      type: 'video',
      contentType: 'video',
      url: '',
      title: '',
      description: '',
      subsection: 'getting-started',
      category: 'general',
      order: content.length,
      steps: [],
      faqs: [],
      features: [],
      estimatedTime: '',
      difficulty: 'easy',
      tags: [],
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/admin/site-content/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete content');
      fetchContent();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (item: SiteContent) => {
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/admin/site-content/${item._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      if (!response.ok) throw new Error('Failed to update content');
      fetchContent();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditModal = (item: SiteContent) => {
    setEditingItem(item);
    setFormData({
      key: item.key,
      type: item.type,
      contentType: item.contentType || 'video',
      url: item.url,
      title: item.title,
      description: item.description || '',
      subsection: item.subsection || 'getting-started',
      category: item.category || 'general',
      order: item.order,
      steps: item.steps || [],
      faqs: item.faqs || [],
      features: item.features || [],
      estimatedTime: item.estimatedTime || '',
      difficulty: item.difficulty || 'easy',
      tags: item.tags || [],
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  // Step management functions
  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          stepNumber: prev.steps.length + 1,
          title: '',
          description: '',
          icon: 'check',
          duration: '',
          tips: [],
        },
      ],
    }));
  };

  const updateStep = (index: number, field: keyof Step, value: any) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      ),
    }));
  };

  const removeStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, stepNumber: i + 1 })),
    }));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formData.steps.length - 1) return;

    const newSteps = [...formData.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];

    setFormData((prev) => ({
      ...prev,
      steps: newSteps.map((step, i) => ({ ...step, stepNumber: i + 1 })),
    }));
  };

  // FAQ management functions
  const addFAQ = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [
        ...prev.faqs,
        {
          question: '',
          answer: '',
          order: prev.faqs.length,
        },
      ],
    }));
  };

  const updateFAQ = (index: number, field: keyof FAQ, value: any) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.map((faq, i) =>
        i === index ? { ...faq, [field]: value } : faq
      ),
    }));
  };

  const removeFAQ = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs
        .filter((_, i) => i !== index)
        .map((faq, i) => ({ ...faq, order: i })),
    }));
  };

  // Feature management functions
  const addFeature = () => {
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, ''],
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.map((f, i) => (i === index ? value : f)),
    }));
  };

  const removeFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const filteredContent = activeTab === 'all'
    ? content
    : content.filter(item => item.contentType === activeTab);

  return {
    // Data
    content,
    filteredContent,
    isLoading,
    error,
    activeTab,
    setActiveTab,

    // Modal state
    showModal,
    setShowModal,
    editingItem,
    formData,
    setFormData,
    isUploading,
    uploadProgress,
    fileInputRef,

    // Handlers
    handleFileUpload,
    handleSubmit,
    handleDelete,
    handleToggleActive,
    openEditModal,
    openAddModal,

    // Step management
    addStep,
    updateStep,
    removeStep,
    moveStep,

    // FAQ management
    addFAQ,
    updateFAQ,
    removeFAQ,

    // Feature management
    addFeature,
    updateFeature,
    removeFeature,
  };
}

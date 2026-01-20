import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlayCircleIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@/constants';

interface Step {
  stepNumber: number;
  title: string;
  description: string;
  icon?: string;
  duration?: string;
  tips?: string[];
}

interface FAQ {
  question: string;
  answer: string;
  order: number;
}

interface SiteContent {
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

const SUBSECTIONS = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'premium-features', label: 'Premium Features' },
  { id: 'agencies', label: 'For Agencies' },
  { id: 'agents', label: 'For Agents' },
  { id: 'buyers', label: 'For Buyers' },
  { id: 'sellers', label: 'For Sellers' },
];

const CATEGORIES = [
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

const CONTENT_TYPES = [
  { id: 'video', label: 'Video Tutorial', icon: PlayCircleIcon },
  { id: 'guide', label: 'Step-by-Step Guide', icon: BookOpenIcon },
  { id: 'faq', label: 'FAQ Section', icon: QuestionMarkCircleIcon },
  { id: 'feature', label: 'Feature Highlight', icon: SparklesIcon },
];

const ICON_OPTIONS = [
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

const HowItWorksManager: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [content, setContent] = useState<SiteContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SiteContent | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'guide' | 'faq'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    key: '',
    type: 'video' as 'video' | 'image',
    contentType: 'video' as 'video' | 'guide' | 'faq' | 'feature',
    url: '',
    title: '',
    description: '',
    subsection: 'getting-started',
    category: 'general',
    order: 0,
    steps: [] as Step[],
    faqs: [] as FAQ[],
    features: [] as string[],
    estimatedTime: '',
    difficulty: 'easy' as 'easy' | 'medium' | 'advanced',
    tags: [] as string[],
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return <BookOpenIcon className="w-5 h-5" />;
      case 'faq': return <QuestionMarkCircleIcon className="w-5 h-5" />;
      case 'feature': return <SparklesIcon className="w-5 h-5" />;
      default: return <PlayCircleIcon className="w-5 h-5" />;
    }
  };

  const getContentTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'guide': return 'bg-emerald-100 text-emerald-700';
      case 'faq': return 'bg-purple-100 text-purple-700';
      case 'feature': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">How It Works Content</h1>
          <p className="text-gray-600 mt-1">Manage tutorials, guides, and FAQs for the How It Works page</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Content
        </button>
      </div>

      {/* Content Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all', label: 'All', count: content.length },
          { id: 'video', label: 'Videos', count: content.filter(c => c.contentType === 'video' || !c.contentType).length },
          { id: 'guide', label: 'Guides', count: content.filter(c => c.contentType === 'guide').length },
          { id: 'faq', label: 'FAQs', count: content.filter(c => c.contentType === 'faq').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Content grouped by subsection */}
      {SUBSECTIONS.map((subsection) => {
        const items = filteredContent.filter((item) => item.subsection === subsection.id);
        if (items.length === 0) return null;

        return (
          <div key={subsection.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{subsection.label}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <div
                    key={item._id}
                    className={`relative rounded-xl overflow-hidden border ${
                      item.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    {/* Content preview */}
                    <div className="aspect-video bg-gray-100 relative">
                      {item.contentType === 'video' || !item.contentType ? (
                        <>
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <PlayCircleIcon className="w-12 h-12 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                          {getContentTypeIcon(item.contentType)}
                          <span className="mt-2 text-sm font-medium text-gray-600 capitalize">
                            {item.contentType}
                          </span>
                          {item.contentType === 'guide' && item.steps && (
                            <span className="text-xs text-gray-500">{item.steps.length} steps</span>
                          )}
                          {item.contentType === 'faq' && item.faqs && (
                            <span className="text-xs text-gray-500">{item.faqs.length} questions</span>
                          )}
                        </div>
                      )}

                      {/* Content type badge */}
                      <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded ${getContentTypeBadgeColor(item.contentType || 'video')}`}>
                        {item.contentType || 'video'}
                      </div>

                      {!item.isActive && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
                          Inactive
                        </div>
                      )}
                    </div>

                    {/* Content info */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                      <p className="text-sm text-gray-500 truncate">{item.key}</p>
                      {item.category && (
                        <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {CATEGORIES.find(c => c.id === item.category)?.label || item.category}
                        </span>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`p-2 rounded-lg transition-colors ${
                            item.isActive
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={item.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {item.isActive ? (
                            <CheckCircleIcon className="w-5 h-5" />
                          ) : (
                            <XCircleIcon className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {filteredContent.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <BookOpenIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
          <p className="text-gray-500 mb-4">Add tutorials, guides, or FAQs to show on the How It Works page</p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" />
            Add First Content
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Edit Content' : 'Add New Content'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Content Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CONTENT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, contentType: type.id as any }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          formData.contentType === type.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key (unique identifier)
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, key: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., getting-started-create-account"
                  required
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., How to Create an Account"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Brief description of the content"
                />
              </div>

              {/* Subsection & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <select
                    value={formData.subsection}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, subsection: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {SUBSECTIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estimated Time & Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Time
                  </label>
                  <input
                    type="text"
                    value={formData.estimatedTime}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, estimatedTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 5 mins"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, difficulty: e.target.value as any }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, order: parseInt(e.target.value) }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={0}
                />
              </div>

              {/* Video Upload - Only for video type */}
              {formData.contentType === 'video' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Video
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {formData.url && formData.url !== 'placeholder' ? (
                      <div className="space-y-2">
                        <video
                          src={formData.url}
                          className="w-full aspect-video rounded-lg bg-gray-100"
                          controls
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Replace video
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        {isUploading ? (
                          <div className="text-center">
                            <div className="w-32 h-2 bg-gray-200 rounded-full mx-auto mb-2">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">
                              Uploading... {uploadProgress}%
                            </span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <CloudArrowUpIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                            <span className="text-sm text-gray-600">
                              Click to upload a video
                            </span>
                          </div>
                        )}
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Or paste video URL
                    </label>
                    <input
                      type="url"
                      value={formData.url === 'placeholder' ? '' : formData.url}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, url: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                </>
              )}

              {/* Steps Editor - Only for guide type */}
              {formData.contentType === 'guide' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Steps ({formData.steps.length})
                    </label>
                    <button
                      type="button"
                      onClick={addStep}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Step
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.steps.map((step, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                              {step.stepNumber}
                            </span>
                            <span className="font-medium text-gray-700">Step {step.stepNumber}</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveStep(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronUpIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStep(index, 'down')}
                              disabled={index === formData.steps.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronDownIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeStep(index)}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => updateStep(index, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Step title"
                          />
                          <textarea
                            value={step.description}
                            onChange={(e) => updateStep(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            rows={2}
                            placeholder="Step description"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <select
                              value={step.icon || 'check'}
                              onChange={(e) => updateStep(index, 'icon', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              {ICON_OPTIONS.map((icon) => (
                                <option key={icon.id} value={icon.id}>
                                  {icon.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={step.duration || ''}
                              onChange={(e) => updateStep(index, 'duration', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="Duration (e.g., 2 mins)"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {formData.steps.length === 0 && (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <BookOpenIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No steps added yet. Click "Add Step" to begin.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FAQ Editor - Only for faq type */}
              {formData.contentType === 'faq' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      FAQs ({formData.faqs.length})
                    </label>
                    <button
                      type="button"
                      onClick={addFAQ}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add FAQ
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.faqs.map((faq, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-gray-700">Question {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeFAQ(index)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Question"
                          />
                          <textarea
                            value={faq.answer}
                            onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            rows={3}
                            placeholder="Answer"
                          />
                        </div>
                      </div>
                    ))}

                    {formData.faqs.length === 0 && (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <QuestionMarkCircleIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No FAQs added yet. Click "Add FAQ" to begin.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Features Editor - Only for feature type */}
              {formData.contentType === 'feature' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Features ({formData.features.length})
                    </label>
                    <button
                      type="button"
                      onClick={addFeature}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Feature
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => updateFeature(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Feature description"
                        />
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {formData.features.length === 0 && (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No features added yet. Click "Add Feature" to begin.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !formData.key ||
                    !formData.title ||
                    (formData.contentType === 'video' && !formData.url) ||
                    (formData.contentType === 'guide' && formData.steps.length === 0) ||
                    (formData.contentType === 'faq' && formData.faqs.length === 0)
                  }
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingItem ? 'Save Changes' : 'Add Content'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HowItWorksManager;

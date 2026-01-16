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
} from '@/constants';

interface SiteContent {
  _id: string;
  key: string;
  type: 'video' | 'image';
  url: string;
  title: string;
  description?: string;
  section: string;
  subsection?: string;
  order: number;
  isActive: boolean;
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

const HowItWorksManager: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [content, setContent] = useState<SiteContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SiteContent | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    key: '',
    type: 'video' as 'video' | 'image',
    url: '',
    title: '',
    description: '',
    subsection: 'getting-started',
    order: 0,
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

      const response = await fetch(url, {
        method: editingItem ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          section: 'how-it-works',
        }),
      });

      if (!response.ok) throw new Error('Failed to save content');

      setShowModal(false);
      setEditingItem(null);
      setFormData({
        key: '',
        type: 'video',
        url: '',
        title: '',
        description: '',
        subsection: 'getting-started',
        order: 0,
      });
      fetchContent();
    } catch (err: any) {
      setError(err.message);
    }
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
      url: item.url,
      title: item.title,
      description: item.description || '',
      subsection: item.subsection || 'getting-started',
      order: item.order,
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      key: '',
      type: 'video',
      url: '',
      title: '',
      description: '',
      subsection: 'getting-started',
      order: content.length,
    });
    setShowModal(true);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">How It Works Videos</h1>
          <p className="text-gray-600 mt-1">Manage tutorial videos for the How It Works page</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Video
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Content grouped by subsection */}
      {SUBSECTIONS.map((subsection) => {
        const items = content.filter((item) => item.subsection === subsection.id);
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
                    {/* Video thumbnail */}
                    <div className="aspect-video bg-gray-100 relative">
                      {item.type === 'video' ? (
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <PlayCircleIcon className="w-12 h-12 text-white" />
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

      {content.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <PlayCircleIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No videos yet</h3>
          <p className="text-gray-500 mb-4">Add tutorial videos to show on the How It Works page</p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" />
            Add First Video
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Edit Video' : 'Add New Video'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Brief description of the video content"
                />
              </div>

              {/* Subsection */}
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

              {/* Video Upload */}
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
                {formData.url ? (
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

              {/* Or URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Or paste video URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, url: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.url || !formData.key || !formData.title}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingItem ? 'Save Changes' : 'Add Video'}
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

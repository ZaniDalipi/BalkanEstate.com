import React, { useState, useEffect } from 'react';
import { tokenService } from '@/src/shared/api/tokenService';

interface ArticleManagerFormProps {
  articleId: string | null;
  onClose: () => void;
}

const ArticleManagerForm: React.FC<ArticleManagerFormProps> = ({ articleId, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'guide',
    country: '',
    countryCode: '',
    tags: '',
    coverImageUrl: '',
    status: 'draft',
    isFeatured: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  const fetchArticle = async () => {
    try {
      const token = tokenService.getAccessToken();
      const res = await fetch(`http://localhost:5001/api/admin/articles?page=1&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // This is simplified - in production you'd fetch by ID
      console.log('Fetch article implementation needed');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = tokenService.getAccessToken();
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      const method = articleId ? 'PATCH' : 'POST';
      const url = articleId
        ? `http://localhost:5001/api/admin/articles/${articleId}`
        : `http://localhost:5001/api/admin/articles`;

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save article');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error saving article');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
        <h2 className="text-2xl font-bold mb-6">{articleId ? 'Edit' : 'Create'} Article</h2>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Excerpt *</label>
            <textarea
              required
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Content *</label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              rows={8}
              placeholder="Enter HTML or markdown content"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="guide">Guide</option>
                <option value="market">Market</option>
                <option value="investment">Investment</option>
                <option value="regulation">Regulation</option>
                <option value="development">Development</option>
                <option value="tourism">Tourism</option>
                <option value="lifestyle">Lifestyle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Country Code</label>
            <input
              type="text"
              maxLength={2}
              value={formData.countryCode}
              onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., AL, RS, HR"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., investment, realestate, tips"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cover Image URL</label>
            <input
              type="url"
              value={formData.coverImageUrl}
              onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                />
                <span className="text-sm font-medium">Featured</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border rounded font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ArticleManagerForm;

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ArticleManagerForm from './ArticleManagerForm';
import { tokenService } from '@/src/shared/api/tokenService';
import { API_CONFIG } from '@/src/shared/constants/app.constants';

interface Article {
  _id: string;
  title: string;
  category: string;
  country?: string;
  status: 'draft' | 'published';
  publishedAt?: string;
  viewCount: number;
}

const ArticleManager: React.FC = () => {
  const { t } = useTranslation('admin');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');

  // Fetch articles
  React.useEffect(() => {
    fetchArticles();
  }, [page, statusFilter]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const token = tokenService.getAccessToken();
      const res = await fetch(
        `${API_CONFIG.BASE_URL}/admin/articles?page=${page}&limit=20${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setArticles(data.articles);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      const token = tokenService.getAccessToken();
      await fetch(`${API_CONFIG.BASE_URL}/admin/articles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchArticles();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const token = tokenService.getAccessToken();
      await fetch(`${API_CONFIG.BASE_URL}/admin/articles/${id}/publish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchArticles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    fetchArticles();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Articles</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          + New Article
        </button>
      </div>

      {showForm && <ArticleManagerForm articleId={editingId} onClose={handleFormClose} />}

      <div className="flex gap-2 mb-6">
        {(['all', 'draft', 'published'] as const).map((status) => (
          <button
            key={status}
            onClick={() => { setStatusFilter(status); setPage(1); }}
            className={`px-4 py-2 rounded ${statusFilter === status ? 'bg-slate-900 text-white' : 'bg-neutral-200'}`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-8 text-slate-600">No articles found</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-left py-3 px-4">Country</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Published</th>
                  <th className="text-left py-3 px-4">Views</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article._id} className="border-b">
                    <td className="py-3 px-4 font-medium">{article.title}</td>
                    <td className="py-3 px-4">{article.category}</td>
                    <td className="py-3 px-4">{article.country || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        article.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {article.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4">{article.viewCount}</td>
                    <td className="py-3 px-4 flex gap-2">
                      <button
                        onClick={() => handlePublish(article._id)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                      >
                        {article.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => { setEditingId(article._id); setShowForm(true); }}
                        className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(article._id)}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-3 py-1">Page {page}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * 20 >= total}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ArticleManager;

import React, { useState, useEffect, useCallback } from 'react';
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
  createdAt?: string;
}

type StatusFilter = 'all' | 'draft' | 'published';

const ArticleManager: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = tokenService.getAccessToken();
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter !== 'all') qs.set('status', statusFilter);

      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/articles?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setArticles(data.articles ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const token = tokenService.getAccessToken();
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/articles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      fetchArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (article: Article) => {
    setTogglingId(article._id);
    try {
      const token = tokenService.getAccessToken();
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/articles/${article._id}/publish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Toggle failed (${res.status})`);
      fetchArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
    } finally {
      setTogglingId(null);
    }
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    fetchArticles();
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Articles</h2>
          {total > 0 && <p className="text-sm text-slate-500 mt-0.5">{total} article{total !== 1 ? 's' : ''} total</p>}
        </div>
        <button
          onClick={() => { setEditingId(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Article
        </button>
      </div>

      {/* Form modal */}
      {showForm && <ArticleManagerForm articleId={editingId} onClose={handleFormClose} />}

      {/* Status filter tabs */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg w-fit">
        {(['all', 'draft', 'published'] as const).map(status => (
          <button
            key={status}
            onClick={() => { setStatusFilter(status); setPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              statusFilter === status
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={fetchArticles} className="ml-auto underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-neutral-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-slate-500 font-medium">No articles found</p>
          <p className="text-slate-400 text-sm mt-1">
            {statusFilter !== 'all' ? `No ${statusFilter} articles yet` : 'Create your first article to get started'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 hidden sm:table-cell">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 hidden md:table-cell">Country</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 hidden lg:table-cell">Published</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 hidden lg:table-cell">Views</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {articles.map(article => (
                  <tr key={article._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900 line-clamp-1">{article.title}</p>
                      <p className="text-xs text-slate-400 sm:hidden mt-0.5">{article.category}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600 hidden sm:table-cell capitalize">{article.category}</td>
                    <td className="py-3 px-4 text-slate-600 hidden md:table-cell">{article.country || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        article.status === 'published'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {article.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs hidden lg:table-cell">
                      {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 hidden lg:table-cell">{article.viewCount ?? 0}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Publish / Unpublish */}
                        <button
                          onClick={() => handleTogglePublish(article)}
                          disabled={togglingId === article._id}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
                            article.status === 'published'
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                        >
                          {togglingId === article._id ? '…' : article.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => handleEdit(article._id)}
                          className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md font-medium transition-colors"
                        >
                          Edit
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(article._id, article.title)}
                          disabled={deletingId === article._id}
                          className="text-xs px-2.5 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-md font-medium transition-colors disabled:opacity-50"
                        >
                          {deletingId === article._id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-neutral-50 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-sm text-slate-600 px-2">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-neutral-50 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ArticleManager;

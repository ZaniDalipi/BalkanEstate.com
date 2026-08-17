import React, { useState, useEffect, useRef, useCallback } from 'react';
import { tokenService } from '@/src/shared/api/tokenService';
import { csrfHeaders } from '@/src/shared/api/httpClient';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import { convertToUploadableImage } from '@/shared/utils/imageConversion';

interface ArticleManagerFormProps {
  articleId: string | null;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'guide', label: 'Guide', color: 'bg-blue-100 text-blue-700' },
  { value: 'market', label: 'Market Analysis', color: 'bg-slate-100 text-slate-700' },
  { value: 'investment', label: 'Investment', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'regulation', label: 'Regulation', color: 'bg-amber-100 text-amber-700' },
  { value: 'development', label: 'Development', color: 'bg-violet-100 text-violet-700' },
  { value: 'tourism', label: 'Tourism', color: 'bg-rose-100 text-rose-700' },
  { value: 'lifestyle', label: 'Lifestyle', color: 'bg-pink-100 text-pink-700' },
];

const BALKAN_COUNTRIES = [
  { name: 'Albania', code: 'AL', flag: '🇦🇱' },
  { name: 'Bosnia & Herzegovina', code: 'BA', flag: '🇧🇦' },
  { name: 'Bulgaria', code: 'BG', flag: '🇧🇬' },
  { name: 'Croatia', code: 'HR', flag: '🇭🇷' },
  { name: 'Greece', code: 'GR', flag: '🇬🇷' },
  { name: 'Kosovo', code: 'XK', flag: '🇽🇰' },
  { name: 'Montenegro', code: 'ME', flag: '🇲🇪' },
  { name: 'North Macedonia', code: 'MK', flag: '🇲🇰' },
  { name: 'Romania', code: 'RO', flag: '🇷🇴' },
  { name: 'Serbia', code: 'RS', flag: '🇷🇸' },
  { name: 'Slovenia', code: 'SI', flag: '🇸🇮' },
];

type ActiveSection = 'write' | 'preview';

const detectHtmlPage = (content: string) =>
  content.includes('<style') || content.trimStart().startsWith('<!DOCTYPE') || content.trimStart().startsWith('<html');

const ArticleManagerForm: React.FC<ArticleManagerFormProps> = ({ articleId, onClose }) => {
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('guide');
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverImagePublicId, setCoverImagePublicId] = useState('');
  const [coverImageFit, setCoverImageFit] = useState<'cover' | 'contain' | 'fill'>('cover');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [isFeatured, setIsFeatured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingArticle, setFetchingArticle] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('write');
  const [coverUploading, setCoverUploading] = useState(false);
  const [inlineUploading, setInlineUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; excerpt?: string; content?: string; coverImageUrl?: string }>({});
  const [previewContent, setPreviewContent] = useState('');
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');

  const editorRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  // Holds HTML content fetched before the editor DOM is ready
  const pendingContentRef = useRef<string | null>(null);

  useEffect(() => {
    if (articleId) loadArticle(articleId);
  }, [articleId]);

  // Once fetchingArticle resolves and the editor mounts, inject any pending content
  useEffect(() => {
    if (!fetchingArticle && pendingContentRef.current !== null && editorRef.current) {
      editorRef.current.innerHTML = pendingContentRef.current;
      setPreviewContent(pendingContentRef.current);
      pendingContentRef.current = null;
    }
  }, [fetchingArticle]);

  const loadArticle = async (id: string) => {
    try {
      setFetchingArticle(true);
      const token = tokenService.getAccessToken();
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/articles/${id}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load article');
      const data = await res.json();
      const a = data.article;
      setTitle(a.title || '');
      setExcerpt(a.excerpt || '');
      setCategory(a.category || 'guide');
      setCountry(a.country || '');
      setCountryCode(a.countryCode || '');
      setTags(a.tags || []);
      setCoverImageUrl(a.coverImageUrl || '');
      setCoverImagePublicId(a.coverImagePublicId || '');
      setCoverImageFit(a.coverImageFit || 'cover');
      setStatus(a.status || 'draft');
      setIsFeatured(a.isFeatured || false);
      // Detect full HTML pages (have <style> tags / DOCTYPE) and switch to source mode
      const rawContent = a.content || '';
      if (detectHtmlPage(rawContent)) {
        setHtmlMode(true);
        setHtmlSource(rawContent);
      } else {
        pendingContentRef.current = rawContent;
      }
    } catch {
      setError('Failed to load article for editing.');
    } finally {
      setFetchingArticle(false);
    }
  };

  // ── Rich Text Editor Commands ──────────────────────────────────────────────

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const execCmd = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }, []);

  const execBlock = useCallback((tag: string) => {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, tag);
  }, []);

  const insertHTML = useCallback((html: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand('insertHTML', false, html);
  }, []);

  const handleEditorInput = () => {
    if (editorRef.current) {
      setPreviewContent(editorRef.current.innerHTML);
    }
  };

  const toggleHtmlMode = () => {
    if (!htmlMode) {
      const currentHtml = editorRef.current?.innerHTML || '';
      setHtmlSource(currentHtml);
      setHtmlMode(true);
    } else {
      setHtmlMode(false);
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlSource;
        setPreviewContent(htmlSource);
      } else {
        pendingContentRef.current = htmlSource;
      }
    }
  };

  // ── Cover Image Upload ─────────────────────────────────────────────────────

  const handleCoverUpload = async (selected: File) => {
    try {
      setCoverUploading(true);
      // Convert HEIC/HEIF to JPEG so the cover image renders in browsers.
      const file = await convertToUploadableImage(selected);
      const token = tokenService.getAccessToken();
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/articles/upload-image`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}`, ...csrfHeaders() },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setCoverImageUrl(data.url);
      setCoverImagePublicId(data.publicId || '');
    } catch {
      setError('Cover image upload failed.');
    } finally {
      setCoverUploading(false);
    }
  };

  // ── Inline Image Upload ────────────────────────────────────────────────────

  const handleInlineImageUpload = async (selected: File) => {
    // Capture the saved range immediately — it was saved when the toolbar button was clicked
    const savedRange = savedRangeRef.current ? savedRangeRef.current.cloneRange() : null;
    try {
      setInlineUploading(true);
      // Convert HEIC/HEIF to JPEG so the inserted image renders in browsers.
      const file = await convertToUploadableImage(selected);
      const token = tokenService.getAccessToken();
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_CONFIG.BASE_URL}/admin/articles/upload-image`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}`, ...csrfHeaders() },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      // Restore focus + selection before inserting so execCommand works
      editorRef.current?.focus();
      const sel = window.getSelection();
      if (sel && savedRange) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }
      document.execCommand('insertHTML', false, `<img src="${data.url}" alt="" style="max-width:100%;border-radius:8px;margin:12px 0;" />`);
      handleEditorInput();
    } catch {
      setError('Inline image upload failed.');
    } finally {
      setInlineUploading(false);
      // Reset the file input so the same file can be re-selected
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = '';
    }
  };

  // ── Tags ───────────────────────────────────────────────────────────────────

  const addTag = (raw: string) => {
    const val = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (val && val.length >= 2 && val.length <= 30 && !tags.includes(val) && tags.length < 20) {
      setTags(prev => [...prev, val]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  // ── Country selector ───────────────────────────────────────────────────────

  const handleCountryChange = (name: string) => {
    const found = BALKAN_COUNTRIES.find(c => c.name === name);
    setCountry(name);
    setCountryCode(found?.code || '');
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const getContentText = (html: string) =>
    html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

  const validateCoverUrl = (url: string) => {
    if (!url) return '';
    try { new URL(url); return ''; } catch { return 'Cover image URL is not valid.'; }
  };

  const handleSubmit = async (submitStatus?: 'draft' | 'published') => {
    const content = htmlMode ? htmlSource : (editorRef.current?.innerHTML || '');
    const contentText = getContentText(content);
    const errs: typeof fieldErrors = {};
    if (!title.trim()) errs.title = 'Title is required.';
    else if (title.trim().length < 5) errs.title = 'Title must be at least 5 characters.';
    if (!excerpt.trim()) errs.excerpt = 'Excerpt is required.';
    else if (excerpt.trim().length < 10) errs.excerpt = 'Excerpt must be at least 10 characters.';
    if (!contentText) errs.content = 'Article body cannot be empty.';
    else if (contentText.length < 50) errs.content = 'Article body must be at least 50 characters.';
    const urlErr = validateCoverUrl(coverImageUrl);
    if (urlErr) errs.coverImageUrl = urlErr;

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setError('Please fix the highlighted fields before saving.');
      return;
    }

    setFieldErrors({});
    const finalStatus = submitStatus || status;

    try {
      setLoading(true);
      setError('');
      const token = tokenService.getAccessToken();
      const payload = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content,
        category,
        tags,
        country: country || undefined,
        countryCode: countryCode || undefined,
        coverImageUrl: coverImageUrl || undefined,
        coverImagePublicId: coverImagePublicId || undefined,
        coverImageFit,
        status: finalStatus,
        isFeatured,
      };

      const method = articleId ? 'PATCH' : 'POST';
      const url = articleId
        ? `${API_CONFIG.BASE_URL}/admin/articles/${articleId}`
        : `${API_CONFIG.BASE_URL}/admin/articles`;

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as any).message || 'Failed to save article');
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving article');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.value === category);
  const selectedCountryObj = BALKAN_COUNTRIES.find(c => c.name === country);

  if (fetchingArticle) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-slate-600 font-medium">Loading article…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-900">
            {articleId ? 'Edit Article' : 'New Article'}
          </span>
          <div className="hidden sm:flex items-center bg-neutral-100 rounded-lg p-0.5">
            {(['write', 'preview'] as const).map(s => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeSection === s ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Editor / Preview + Bottom Bar ────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-white">
          {activeSection === 'write' ? (
            <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">

              {/* Cover Image */}
              <div
                className={`relative w-full rounded-2xl overflow-hidden mb-8 cursor-pointer group ${coverImageUrl ? 'aspect-[1200/628]' : 'h-40 border-2 border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-400'} transition-all`}
                onClick={() => coverInputRef.current?.click()}
              >
                {coverImageUrl ? (
                  <>
                    <img
                      src={coverImageUrl}
                      alt="Cover"
                      className={`absolute inset-0 w-full h-full object-center ${coverImageFit === 'contain' ? 'object-contain bg-slate-100' : coverImageFit === 'fill' ? 'object-fill' : 'object-cover'}`}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-medium">Change cover photo</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setCoverImageUrl(''); setCoverImagePublicId(''); }}
                      className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-slate-700 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                    {coverUploading ? (
                      <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium">Add a cover photo</span>
                        <span className="text-xs">Click to upload · JPG, PNG, WebP · max 10MB</span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
                />
              </div>

              {/* Title */}
              <textarea
                value={title}
                onChange={e => { setTitle(e.target.value); if (fieldErrors.title) setFieldErrors(p => ({ ...p, title: undefined })); }}
                placeholder="Article title…"
                rows={2}
                maxLength={120}
                className={`w-full text-3xl sm:text-4xl font-bold text-slate-900 placeholder:text-neutral-300 border-none outline-none resize-none leading-tight ${fieldErrors.title ? 'border-b-2 border-red-400 pb-1' : 'mb-1'}`}
              />
              <div className="flex items-center justify-between mb-3">
                {fieldErrors.title
                  ? <p className="text-xs text-red-500">{fieldErrors.title}</p>
                  : <span />}
                <span className={`text-[11px] ${title.length > 100 ? 'text-amber-500' : 'text-slate-300'}`}>{title.length}/120</span>
              </div>

              {/* Excerpt */}
              <textarea
                value={excerpt}
                onChange={e => { setExcerpt(e.target.value); if (fieldErrors.excerpt) setFieldErrors(p => ({ ...p, excerpt: undefined })); }}
                placeholder="Write a short excerpt (shown in listing cards)…"
                rows={2}
                maxLength={500}
                className={`w-full text-base text-slate-500 placeholder:text-neutral-300 border-none outline-none resize-none leading-relaxed ${fieldErrors.excerpt ? 'border-b-2 border-red-400 pb-1' : 'mb-1'}`}
              />
              <div className="flex items-center justify-between mb-5">
                {fieldErrors.excerpt
                  ? <p className="text-xs text-red-500">{fieldErrors.excerpt}</p>
                  : <span />}
                <span className={`text-[11px] ${excerpt.length > 450 ? 'text-amber-500' : 'text-slate-300'}`}>{excerpt.length}/500</span>
              </div>

              <div className="border-t border-neutral-100 mb-6" />

              {/* ── Toolbar ─────────────────────────────────────────────── */}
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-xl flex flex-wrap items-center gap-0.5 px-2 py-1.5 mb-4 shadow-sm">
                {htmlMode ? (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-200">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                      HTML Source Mode
                    </span>
                    <span className="text-xs text-slate-400">Paste a full HTML page — styles &amp; layout are preserved</span>
                    <div className="flex-1" />
                    <ToolbarBtn title="Switch to Visual Editor" onClick={toggleHtmlMode}>
                      <span className="text-[9px] font-bold tracking-wide">WYSIWYG</span>
                    </ToolbarBtn>
                  </div>
                ) : (
                  <>
                <ToolbarBtn title="Bold (Ctrl+B)" onClick={() => execCmd('bold')}>
                  <strong>B</strong>
                </ToolbarBtn>
                <ToolbarBtn title="Italic (Ctrl+I)" onClick={() => execCmd('italic')}>
                  <em>I</em>
                </ToolbarBtn>
                <ToolbarBtn title="Underline (Ctrl+U)" onClick={() => execCmd('underline')}>
                  <span className="underline">U</span>
                </ToolbarBtn>
                <ToolbarBtn title="Strikethrough" onClick={() => execCmd('strikeThrough')}>
                  <span className="line-through">S</span>
                </ToolbarBtn>

                <div className="w-px h-5 bg-neutral-200 mx-1" />

                <ToolbarBtn title="Heading 1" onClick={() => execBlock('h1')}>H1</ToolbarBtn>
                <ToolbarBtn title="Heading 2" onClick={() => execBlock('h2')}>H2</ToolbarBtn>
                <ToolbarBtn title="Heading 3" onClick={() => execBlock('h3')}>H3</ToolbarBtn>
                <ToolbarBtn title="Paragraph" onClick={() => execBlock('p')}>P</ToolbarBtn>

                <div className="w-px h-5 bg-neutral-200 mx-1" />

                <ToolbarBtn title="Bullet list" onClick={() => execCmd('insertUnorderedList')}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a1 1 0 100-2 1 1 0 000 2zm3-1a1 1 0 011-1h10a1 1 0 110 2H7a1 1 0 01-1-1zm-3 6a1 1 0 100-2 1 1 0 000 2zm3-1a1 1 0 011-1h10a1 1 0 110 2H7a1 1 0 01-1-1zm-3 6a1 1 0 100-2 1 1 0 000 2zm3-1a1 1 0 011-1h10a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </ToolbarBtn>
                <ToolbarBtn title="Numbered list" onClick={() => execCmd('insertOrderedList')}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4h2v2H4V4zm0 4h2v2H4V8zm0 4h2v2H4v-2zm4-8h8v2H8V4zm0 4h8v2H8V8zm0 4h8v2H8v-2z" />
                  </svg>
                </ToolbarBtn>
                <ToolbarBtn title="Blockquote" onClick={() => execBlock('blockquote')}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </ToolbarBtn>

                <div className="w-px h-5 bg-neutral-200 mx-1" />

                <ToolbarBtn
                  title="Insert link"
                  onClick={() => {
                    const url = prompt('Enter URL:');
                    if (url) execCmd('createLink', url);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </ToolbarBtn>

                <ToolbarBtn
                  title="Insert image from file"
                  onClick={() => { saveSelection(); inlineImageInputRef.current?.click(); }}
                  disabled={inlineUploading}
                >
                  {inlineUploading ? (
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </ToolbarBtn>

                <ToolbarBtn title="Horizontal rule" onClick={() => execCmd('insertHorizontalRule')}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
                  </svg>
                </ToolbarBtn>

                <div className="w-px h-5 bg-neutral-200 mx-1" />

                <ToolbarBtn title="Clear formatting" onClick={() => execCmd('removeFormat')}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </ToolbarBtn>

                <div className="w-px h-5 bg-neutral-200 mx-1" />

                <ToolbarBtn title="Switch to HTML source mode" onClick={toggleHtmlMode}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </ToolbarBtn>

                <input
                  ref={inlineImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleInlineImageUpload(e.target.files[0])}
                />
                  </>
                )}
              </div>

              {/* ── Content Editor ───────────────────────────────────────── */}
              {htmlMode ? (
                <>
                  <textarea
                    value={htmlSource}
                    onChange={e => {
                      setHtmlSource(e.target.value);
                      if (fieldErrors.content) setFieldErrors(p => ({ ...p, content: undefined }));
                    }}
                    spellCheck={false}
                    placeholder="Paste your full HTML page here — including <style> blocks, custom layouts, everything…"
                    className={`w-full min-h-[560px] font-mono text-[13px] leading-6 text-slate-700 bg-slate-950 border rounded-xl p-4 resize-y focus:outline-none focus:ring-2 placeholder:text-slate-600 ${fieldErrors.content ? 'border-red-400 focus:ring-red-400/40' : 'border-slate-700 focus:ring-violet-500/40'}`}
                    style={{ colorScheme: 'dark' }}
                  />
                  {fieldErrors.content && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {fieldErrors.content}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => { handleEditorInput(); if (fieldErrors.content) setFieldErrors(p => ({ ...p, content: undefined })); }}
                    onMouseUp={saveSelection}
                    onKeyUp={saveSelection}
                    data-placeholder="Start writing your article…"
                    className="min-h-[400px] text-slate-800 text-base leading-7 outline-none
                      [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-slate-900
                      [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-slate-900
                      [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-slate-900
                      [&_p]:mb-3
                      [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3
                      [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3
                      [&_li]:mb-1
                      [&_blockquote]:border-l-4 [&_blockquote]:border-blue-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-4
                      [&_a]:text-blue-600 [&_a]:underline
                      [&_hr]:border-neutral-200 [&_hr]:my-6
                      [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-4
                      [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
                      [&_pre]:bg-slate-900 [&_pre]:text-green-300 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-4
                      empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300 empty:before:pointer-events-none"
                  />
                  {fieldErrors.content && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {fieldErrors.content}
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            /* ── Preview ─────────────────────────────────────────────────── */
            <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
              {coverImageUrl && (
                <img src={coverImageUrl} alt="Cover" className="w-full h-64 object-cover rounded-2xl mb-8" />
              )}
              <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-slate-500">
                {selectedCountryObj && (
                  <span className="flex items-center gap-1">{selectedCountryObj.flag} {selectedCountryObj.name}</span>
                )}
                {selectedCountryObj && selectedCategory && <span>·</span>}
                {selectedCategory && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${selectedCategory.color}`}>
                    {selectedCategory.label}
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">
                {title || <span className="text-neutral-300">Article title…</span>}
              </h1>
              <p className="text-lg text-slate-500 mb-6 leading-relaxed">
                {excerpt || <span className="text-neutral-300">Excerpt…</span>}
              </p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {tags.map(t => (
                    <span key={t} className="px-3 py-1 bg-neutral-100 text-slate-600 text-sm rounded-full">#{t}</span>
                  ))}
                </div>
              )}
              <div className="border-t border-neutral-100 mb-8" />
              {htmlMode ? (
                htmlSource.trim() ? (
                  <iframe
                    srcDoc={htmlSource}
                    sandbox="allow-same-origin"
                    className="w-full border border-neutral-200 rounded-2xl"
                    style={{ height: '75vh', minHeight: '400px' }}
                    title="HTML Page Preview"
                  />
                ) : (
                  <p className="text-neutral-300 text-sm">Paste HTML in the editor to see the preview…</p>
                )
              ) : (
                <div
                  className="prose prose-slate max-w-none [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl [&_blockquote]:border-l-4 [&_blockquote]:border-blue-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:rounded-xl"
                  dangerouslySetInnerHTML={{ __html: previewContent || '<p class="text-neutral-300">Start writing to see the preview…</p>' }}
                />
              )}
            </div>
          )}
        </div>
        {/* ── Bottom Action Bar ────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-white border-t border-neutral-200 px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {error && (
              <span className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-full truncate max-w-sm">
                {error}
              </span>
            )}
            {saveSuccess && (
              <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleSubmit('draft')}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 transition-colors"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSubmit('published')}
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : status === 'published' ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>
        </div>

        {/* ── Right Sidebar ────────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-72 bg-slate-50 border-l border-neutral-200 overflow-y-auto flex-shrink-0">
          <div className="p-5 space-y-6">

            {/* Status & Featured */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Publishing</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Featured article</span>
                  <button
                    onClick={() => setIsFeatured(!isFeatured)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isFeatured ? 'bg-slate-900' : 'bg-neutral-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${isFeatured ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Category</h3>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      category === cat.value
                        ? cat.color + ' ring-2 ring-offset-1 ring-slate-400'
                        : 'bg-white border border-neutral-200 text-slate-600 hover:border-neutral-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Country */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Country</h3>
              <select
                value={country}
                onChange={e => handleCountryChange(e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                <option value="">— No specific country —</option>
                {BALKAN_COUNTRIES.map(c => (
                  <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                ))}
              </select>
              {countryCode && (
                <p className="text-[11px] text-slate-400 mt-1">Code: <strong>{countryCode}</strong></p>
              )}
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tags</h3>
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-slate-900 text-white text-xs rounded-full">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-300 transition-colors leading-none">×</button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => tagInput.trim() && addTag(tagInput)}
                placeholder="Type tag, press Enter"
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">Enter or comma to add · {20 - tags.length} remaining</p>
            </div>

            {/* Cover image URL fallback */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Cover Image URL</h3>
              <input
                type="url"
                value={coverImageUrl}
                onChange={e => { setCoverImageUrl(e.target.value); if (fieldErrors.coverImageUrl) setFieldErrors(p => ({ ...p, coverImageUrl: undefined })); }}
                placeholder="https://…"
                className={`w-full text-sm border rounded-lg px-3 py-2 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${fieldErrors.coverImageUrl ? 'border-red-400 focus:ring-red-300' : 'border-neutral-200 focus:ring-slate-900/20'}`}
              />
              {fieldErrors.coverImageUrl
                ? <p className="text-[11px] text-red-500 mt-1">{fieldErrors.coverImageUrl}</p>
                : <p className="text-[11px] text-slate-400 mt-1">Or paste URL instead of uploading above</p>
              }
            </div>

            {/* Cover Image Fit */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Cover Image Fit</h3>
              <div className="flex rounded-lg overflow-hidden border border-neutral-200">
                {([
                  { value: 'cover', label: 'Cover (crop to fill)' },
                  { value: 'contain', label: 'Contain (show full image)' },
                  { value: 'fill', label: 'Fill (stretch)' },
                ] as const).map((opt, i) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCoverImageFit(opt.value)}
                    className={`flex-1 px-2 py-2 text-[11px] font-medium transition-colors leading-tight text-center ${i > 0 ? 'border-l border-neutral-200' : ''} ${
                      coverImageFit === opt.value
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 hover:bg-neutral-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">How the cover image fills the 1200×628 frame</p>
            </div>

            {/* SEO Preview */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">SEO Preview</h3>
              <div className="bg-white border border-neutral-200 rounded-xl p-3 space-y-1">
                <p className="text-xs text-blue-700 font-medium truncate">{title || 'Article Title'}</p>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{excerpt || 'Article excerpt will appear here in search results…'}</p>
              </div>
            </div>

          </div>
        </aside>
      </div>
    </div>
  );
};

// ── Toolbar Button ─────────────────────────────────────────────────────────────
const ToolbarBtn: React.FC<{
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ title, onClick, disabled, children }) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onMouseDown={e => { e.preventDefault(); onClick(); }}
    className="w-7 h-7 flex items-center justify-center text-xs font-medium text-slate-600 rounded hover:bg-neutral-100 hover:text-slate-900 disabled:opacity-40 transition-colors"
  >
    {children}
  </button>
);

export default ArticleManagerForm;

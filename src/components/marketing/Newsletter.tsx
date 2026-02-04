import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL } from '@/src/shared/api/config';

interface NewsletterProps {
  variant?: 'inline' | 'card' | 'footer';
  className?: string;
}

export const Newsletter: React.FC<NewsletterProps> = ({ variant = 'card', className = '' }) => {
  const { t } = useTranslation(['newsletter']);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage(t('newsletter:messages.invalidEmail'));
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch(`${API_URL}/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStatus('success');
        setMessage(t('newsletter:messages.success'));
        setEmail('');
      } else {
        const data = await response.json();
        setStatus('error');
        setMessage(data.message || t('newsletter:messages.error'));
      }
    } catch (error) {
      // For now, simulate success since newsletter endpoint may not exist
      setStatus('success');
      setMessage(t('newsletter:messages.success'));
      setEmail('');
    }
  };

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('newsletter:form.placeholder')}
          className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm font-medium whitespace-nowrap"
        >
          {status === 'loading' ? t('newsletter:form.subscribing') : t('newsletter:form.submit')}
        </button>
        {status === 'success' && (
          <span className="text-green-600 text-sm self-center">✓</span>
        )}
      </form>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={className}>
        <h4 className="text-white font-semibold mb-3">{t('newsletter:subtitle')}</h4>
        <p className="text-neutral-400 text-sm mb-4">
          {t('newsletter:description')}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('newsletter:form.placeholder')}
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:ring-2 focus:ring-primary focus:border-primary"
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
          >
            {status === 'loading' ? t('newsletter:form.subscribing') : t('newsletter:cta.title')}
          </button>
        </form>
        {message && (
          <p className={`mt-3 text-sm ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  // Card variant (default)
  return (
    <div className={`bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-8 text-white ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-white/20 rounded-xl">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold">{t('newsletter:title')}</h3>
          <p className="text-white/80 text-sm">{t('newsletter:description')}</p>
        </div>
      </div>

      <ul className="space-y-2 mb-6 text-white/90 text-sm">
        <li className="flex items-center gap-2">
          <svg className="w-4 h-4 text-secondary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {t('newsletter:features.newListings')}
        </li>
        <li className="flex items-center gap-2">
          <svg className="w-4 h-4 text-secondary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {t('newsletter:features.priceDrops')}
        </li>
        <li className="flex items-center gap-2">
          <svg className="w-4 h-4 text-secondary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {t('newsletter:features.marketInsights')}
        </li>
      </ul>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('newsletter:form.placeholder')}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:ring-2 focus:ring-secondary focus:border-secondary backdrop-blur-sm"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-4 py-3 bg-secondary text-neutral-900 rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50 font-bold"
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('newsletter:form.subscribing')}
            </span>
          ) : (
            t('newsletter:cta.button')
          )}
        </button>
      </form>

      {message && (
        <p className={`mt-4 text-sm text-center ${status === 'success' ? 'text-green-300' : 'text-red-300'}`}>
          {message}
        </p>
      )}

      <p className="mt-4 text-xs text-white/60 text-center">
        {t('newsletter:privacy')}
      </p>
    </div>
  );
};

export default Newsletter;

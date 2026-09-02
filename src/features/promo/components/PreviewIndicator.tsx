import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAdPreview, exitAdPreview } from '../hooks/usePreview';

/**
 * Floating banner shown while ad-preview mode is active (opened from an admin
 * "View on site" link). Explains the highlighted slots and lets the user exit.
 */
const AdPreviewIndicator: React.FC = () => {
  const { t } = useTranslation(['common']);
  const preview = useAdPreview();

  if (!preview.active) return null;

  const handleExit = () => {
    exitAdPreview();
    // Drop the preview params from the URL without a reload.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('adPreview');
      url.searchParams.delete('adFocus');
      window.history.replaceState({}, '', url.toString());
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 140,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        maxWidth: '92vw',
        padding: '8px 10px 8px 14px',
        borderRadius: 9999,
        background: '#4338ca',
        color: '#fff',
        boxShadow: '0 8px 24px rgba(67,56,202,0.4)',
        fontSize: 13,
      }}
      role="status"
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t('ads.previewMode', 'Ad preview — ad slots are highlighted')}
        </span>
      </span>
      <button
        type="button"
        onClick={handleExit}
        style={{
          flexShrink: 0,
          background: 'rgba(255,255,255,0.18)',
          color: '#fff',
          border: 'none',
          borderRadius: 9999,
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {t('ads.exitPreview', 'Exit')}
      </button>
    </div>
  );
};

export default AdPreviewIndicator;

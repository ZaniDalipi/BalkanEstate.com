// SocialVideoEmbed Component
// Shows a preview card for TikTok, Instagram, and Facebook videos that opens in the respective app

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface SocialVideoEmbedProps {
  videoUrl: string;
}

// Detect platform from URL
const detectPlatform = (url: string): 'tiktok' | 'instagram' | 'facebook' | null => {
  if (!url) return null;
  if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
  return null;
};

export const SocialVideoEmbed: React.FC<SocialVideoEmbedProps> = ({ videoUrl }) => {
  const { t } = useTranslation(['property']);

  const platform = useMemo(() => detectPlatform(videoUrl), [videoUrl]);

  // Don't render if no valid platform
  if (!platform) return null;

  const getPlatformConfig = () => {
    switch (platform) {
      case 'tiktok':
        return {
          name: 'TikTok',
          icon: (
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
            </svg>
          ),
          gradient: 'from-black to-neutral-800',
          buttonBg: 'bg-[#ff0050] hover:bg-[#ff0050]/90',
          accentColor: '#ff0050',
        };
      case 'instagram':
        return {
          name: 'Instagram',
          icon: (
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          ),
          gradient: 'from-purple-600 via-pink-500 to-orange-400',
          buttonBg: 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:from-purple-700 hover:via-pink-600 hover:to-orange-500',
          accentColor: '#E1306C',
        };
      case 'facebook':
        return {
          name: 'Facebook',
          icon: (
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          ),
          gradient: 'from-blue-600 to-blue-700',
          buttonBg: 'bg-blue-600 hover:bg-blue-700',
          accentColor: '#1877F2',
        };
      default:
        return null;
    }
  };

  const config = getPlatformConfig();
  if (!config) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden">
      {/* Gradient Header with Platform Branding */}
      <div className={`bg-gradient-to-r ${config.gradient} p-6`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {config.icon}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {t('property:socialVideo.title', 'Property Video')}
            </h3>
            <p className="text-white/80 text-sm">{t('property:socialVideo.watchOn', 'Watch on')} {config.name}</p>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        <div className="text-center">
          {/* Play Button */}
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-3 ${config.buttonBg} text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <span>{t('property:socialVideo.watchVideo', 'Watch Video')}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          <p className="mt-4 text-sm text-neutral-500">
            {t('property:socialVideo.openInApp', 'Opens in')} {config.name}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SocialVideoEmbed;

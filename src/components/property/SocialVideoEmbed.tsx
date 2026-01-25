// SocialVideoEmbed Component
// Embeds TikTok and Instagram videos to play directly in the app

import React, { useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface SocialVideoEmbedProps {
  videoUrl: string;
}

// Detect platform from URL
const detectPlatform = (url: string): 'tiktok' | 'instagram' | null => {
  if (!url) return null;
  if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  return null;
};

// Extract TikTok video ID
const extractTikTokId = (url: string): string => {
  const match = url.match(/(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/)(\d+)/);
  return match?.[1] || '';
};

// Extract Instagram post/reel ID
const extractInstagramId = (url: string): string => {
  const match = url.match(/(?:instagram\.com\/(?:reel|p)\/)([A-Za-z0-9_-]+)/);
  return match?.[1] || '';
};

// Check if Instagram URL is a reel
const isInstagramReel = (url: string): boolean => {
  return url.includes('/reel/');
};

export const SocialVideoEmbed: React.FC<SocialVideoEmbedProps> = ({ videoUrl }) => {
  const { t } = useTranslation(['property']);
  const containerRef = useRef<HTMLDivElement>(null);

  const platform = useMemo(() => detectPlatform(videoUrl), [videoUrl]);
  const tiktokId = useMemo(() => extractTikTokId(videoUrl), [videoUrl]);
  const instagramId = useMemo(() => extractInstagramId(videoUrl), [videoUrl]);
  const isReel = useMemo(() => isInstagramReel(videoUrl), [videoUrl]);

  // Load Instagram embed script
  useEffect(() => {
    if (platform === 'instagram' && instagramId) {
      // Load Instagram embed script
      const existingScript = document.querySelector('script[src*="instagram.com/embed.js"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://www.instagram.com/embed.js';
        script.async = true;
        document.body.appendChild(script);
      }
      // Process embeds after a short delay
      const timer = setTimeout(() => {
        if ((window as any).instgrm?.Embeds?.process) {
          (window as any).instgrm.Embeds.process();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [platform, instagramId]);

  // Re-process Instagram embeds when component updates
  useEffect(() => {
    if (platform === 'instagram' && containerRef.current) {
      const timer = setTimeout(() => {
        if ((window as any).instgrm?.Embeds?.process) {
          (window as any).instgrm.Embeds.process();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [platform]);

  // Don't render if no valid platform or ID
  if (!platform) return null;
  if (platform === 'tiktok' && !tiktokId) return null;
  if (platform === 'instagram' && !instagramId) return null;

  const instagramPermalink = isReel
    ? `https://www.instagram.com/reel/${instagramId}/`
    : `https://www.instagram.com/p/${instagramId}/`;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className={`p-4 ${platform === 'tiktok' ? 'bg-black' : 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400'}`}>
        <div className="flex items-center gap-3">
          {platform === 'tiktok' && (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            </div>
          )}
          {platform === 'instagram' && (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-white">
              {t('property:socialVideo.title', 'Property Video')}
            </h3>
            <p className="text-white/80 text-sm capitalize">{platform}</p>
          </div>
        </div>
      </div>

      {/* Video Embed Container */}
      <div ref={containerRef} className="flex justify-center bg-neutral-50 p-4">
        {/* TikTok Embed - Using official player */}
        {platform === 'tiktok' && (
          <div className="w-full max-w-[400px]" style={{ aspectRatio: '9/16', maxHeight: '600px' }}>
            <iframe
              src={`https://www.tiktok.com/player/v1/${tiktokId}?music_info=1&description=1`}
              className="w-full h-full border-0 rounded-lg"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title="TikTok video"
            />
          </div>
        )}

        {/* Instagram Embed - Using official blockquote */}
        {platform === 'instagram' && (
          <blockquote
            className="instagram-media"
            data-instgrm-captioned
            data-instgrm-permalink={instagramPermalink}
            data-instgrm-version="14"
            style={{
              background: '#FFF',
              border: 0,
              borderRadius: '3px',
              boxShadow: '0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15)',
              margin: '1px',
              maxWidth: '540px',
              minWidth: '326px',
              padding: 0,
              width: '99.375%',
            }}
          >
            <div style={{ padding: '16px' }}>
              <a
                href={instagramPermalink}
                style={{
                  background: '#FFFFFF',
                  lineHeight: 0,
                  padding: 0,
                  textAlign: 'center',
                  textDecoration: 'none',
                  width: '100%',
                }}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-neutral-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-3 bg-neutral-200 rounded w-24 mb-2" />
                    <div className="h-3 bg-neutral-200 rounded w-16" />
                  </div>
                </div>
                <div className="aspect-square bg-neutral-100 rounded flex items-center justify-center mb-4">
                  <svg className="w-16 h-16 text-neutral-300" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <div className="text-center text-blue-500 font-medium">
                  View this post on Instagram
                </div>
              </a>
            </div>
          </blockquote>
        )}
      </div>
    </div>
  );
};

export default SocialVideoEmbed;

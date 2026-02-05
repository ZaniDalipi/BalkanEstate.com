/**
 * Video Placeholder Component
 * Shows video content if available, otherwise displays a fallback
 */

import React from 'react';

export interface SiteVideo {
  _id: string;
  key: string;
  url: string;
  title: string;
  description?: string;
  subsection?: string;
}

// Known subsections for video categorization
const KNOWN_SUBSECTIONS = ['getting-started', 'premium-features', 'agencies', 'agents', 'buyers', 'sellers'];

interface VideoPlaceholderProps {
  videoKey: string;
  videos: Record<string, SiteVideo[]>;
  fallbackIcon: React.ReactNode;
  fallbackTitle: string;
  fallbackSubtitle?: string;
  className?: string;
  onClick?: () => void;
}

const VideoPlaceholder: React.FC<VideoPlaceholderProps> = ({
  videoKey,
  videos,
  fallbackIcon,
  fallbackTitle,
  fallbackSubtitle,
  className = '',
  onClick,
}) => {
  // Extract subsection from videoKey - handles both formats like "getting-started-xxx" and "agencies-xxx"
  let subsection = 'general';
  for (const sub of KNOWN_SUBSECTIONS) {
    if (videoKey.startsWith(sub + '-') || videoKey === sub) {
      subsection = sub;
      break;
    }
  }

  const sectionVideos = videos[subsection] || [];
  const video = sectionVideos.find(v => v.key === videoKey);

  if (video) {
    return (
      <div className={`relative ${className}`} onClick={onClick}>
        <video
          src={video.url}
          className="w-full h-full object-cover rounded-lg"
          controls
          preload="metadata"
          poster={`${video.url.replace(/\.[^.]+$/, '.jpg')}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${className} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
    >
      <div className="text-center">
        {fallbackIcon}
        <p className="font-medium">{fallbackTitle}</p>
        {fallbackSubtitle && <p className="text-sm opacity-70">{fallbackSubtitle}</p>}
      </div>
    </div>
  );
};

export default VideoPlaceholder;

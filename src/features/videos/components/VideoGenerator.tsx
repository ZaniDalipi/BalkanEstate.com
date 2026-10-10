import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { useVideoPreview, useGenerateVideo } from '../hooks/useVideoGeneration';
import {
  VideoFormat,
  VideoQuality,
  MusicStyle,
  BackgroundStyle,
  DownloadedVideo,
  VideoPreview,
  saveVideoToDevice,
} from '../api/videoApi';

interface VideoGeneratorProps {
  property: Property;
  onVideoGenerated?: (video: DownloadedVideo) => void;
  onClose?: () => void;
}

// Icons
const VideoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const MusicNoteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// Social media icons
const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TikTokIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const YouTubeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const FORMAT_OPTIONS: { value: VideoFormat; label: string; icon: string; description: string }[] = [
  { value: 'vertical', label: 'Reels (9:16)', icon: '📱', description: 'Instagram Reels & TikTok' },
  { value: 'horizontal', label: 'Landscape (16:9)', icon: '🖥️', description: 'YouTube & Websites' },
  { value: 'square', label: 'Square (1:1)', icon: '⬜', description: 'Instagram Feed' },
];

const MUSIC_OPTIONS: { value: MusicStyle; label: string; description: string }[] = [
  { value: 'elegant', label: 'Elegant Piano', description: 'Perfect for luxury properties' },
  { value: 'upbeat', label: 'Upbeat Corporate', description: 'Great for modern homes' },
  { value: 'calm', label: 'Calm Ambient', description: 'Ideal for countryside properties' },
  { value: 'modern', label: 'Modern Electronic', description: 'Suits urban apartments' },
];

const QUALITY_OPTIONS: { value: VideoQuality; label: string; description: string }[] = [
  { value: 'mobile', label: 'Mobile (720p)', description: 'Smaller file, faster loading' },
  { value: 'standard', label: 'Standard (1080p)', description: 'Full quality, larger file' },
];

const BACKGROUND_OPTIONS: { value: BackgroundStyle; label: string; description: string; icon: string }[] = [
  { value: 'elegant', label: 'Elegant Dark', description: 'Premium dark with gold accents', icon: '✨' },
  { value: 'gradient', label: 'Gradient', description: 'Purple-blue gradient (Canva style)', icon: '🎨' },
  { value: 'dark', label: 'Pure Dark', description: 'Clean dark background', icon: '🌙' },
  { value: 'blur', label: 'Blur Effect', description: 'Blurred background effect', icon: '🔲' },
];

const VideoGenerator: React.FC<VideoGeneratorProps> = ({
  property,
  onVideoGenerated,
  onClose,
}) => {
  const { t } = useTranslation();

  // Video options state
  const [format, setFormat] = useState<VideoFormat>('vertical');
  const [quality, setQuality] = useState<VideoQuality>('mobile'); // Default to mobile for smaller file size
  const [duration, setDuration] = useState<number>(3);
  const [musicStyle, setMusicStyle] = useState<MusicStyle>('elegant');
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>('elegant');
  const [includeWatermark, setIncludeWatermark] = useState<boolean>(true);

  // Fetch preview data
  const { data: preview, isLoading: isLoadingPreview } = useVideoPreview(property.id, { format, duration });

  // Render the video (kept in the browser only — never uploaded)
  const { generateVideo, isGenerating, status, error, data: generatedVideo, reset } = useGenerateVideo({
    onSuccess: (video) => onVideoGenerated?.(video),
  });

  // Check if property has enough images
  const hasImages = property.images && property.images.length > 0;
  const imageCount = property.images?.length || 0;

  // Calculate estimated duration
  const estimatedDuration = useMemo(() => {
    if (!preview) return 0;
    return preview.estimatedDuration;
  }, [preview]);

  // Handle generate video
  const handleGenerate = useCallback(() => {
    generateVideo({
      propertyId: property.id,
      videoOptions: {
        format,
        quality,
        duration,
        musicStyle,
        backgroundStyle,
        includeWatermark,
      },
    });
  }, [property.id, format, quality, duration, musicStyle, backgroundStyle, includeWatermark, generateVideo]);

  const handleDownload = useCallback(() => {
    if (generatedVideo) saveVideoToDevice(generatedVideo);
  }, [generatedVideo]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <VideoIcon className="w-6 h-6 text-white" />
          <div>
            <h3 className="text-lg font-semibold text-white">{t('seller:ui.videoGenerator.videoGenerator', 'Video Generator')}</h3>
            <p className="text-white/80 text-sm">{t('seller:ui.videoGenerator.createAStunningVideoReel', 'Create a stunning video reel from your property photos')}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {!hasImages ? (
          // No images warning
          <div className="text-center py-8">
            <VideoIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-neutral-700 mb-2">{t('seller:ui.videoGenerator.noImagesAvailable', 'No Images Available')}</h4>
            <p className="text-neutral-500">
              {t('seller:ui.videoGenerator.uploadPropertyImagesFirstTo', 'Upload property images first to generate a video showcase.')}
            </p>
          </div>
        ) : isGenerating ? (
          // Generating state
          <div className="text-center py-8" role="status" aria-live="polite">
            <SpinnerIcon className="w-16 h-16 text-primary mx-auto mb-6" />
            <h4 className="text-lg font-medium text-neutral-700 mb-2">{t('seller:ui.videoGenerator.creatingYourVideo', 'Creating Your Video...')}</h4>
            <p className="text-neutral-500 text-sm">
              {t('seller:ui.videoGenerator.thisCanTakeAMinute', 'This can take a minute. Please don\'t close this window.')}
            </p>
          </div>
        ) : status === 'completed' && generatedVideo ? (
          // Success state
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-lg font-medium text-neutral-700 mb-2">{t('seller:ui.videoGenerator.yourVideoIsReady', 'Your Video Is Ready!')}</h4>
            <p className="text-neutral-500 text-sm mb-6">
              {Math.round(generatedVideo.duration)}{t('seller:ui.videoGenerator.sVideoDownloadItPost', 's video — download it, post it, then add the link to your listing.')}
            </p>

            {/* Local preview (plays from the file in your browser) */}
            <div className="relative bg-neutral-900 rounded-lg overflow-hidden mb-6 max-w-md mx-auto aspect-video">
              <video
                src={generatedVideo.objectUrl}
                controls
                playsInline
                className="w-full h-full object-contain"
                poster={property.imageUrl}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                <DownloadIcon className="w-5 h-5" />
                {t('seller:ui.videoGenerator.downloadVideo', 'Download Video')}
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                {t('seller:ui.videoGenerator.createAnother', 'Create Another')}
              </button>
            </div>

            <PostToPlatforms />
          </div>
        ) : (
          // Options form for new video
          <VideoOptionsForm
            format={format}
            setFormat={setFormat}
            quality={quality}
            setQuality={setQuality}
            duration={duration}
            setDuration={setDuration}
            musicStyle={musicStyle}
            setMusicStyle={setMusicStyle}
            backgroundStyle={backgroundStyle}
            setBackgroundStyle={setBackgroundStyle}
            includeWatermark={includeWatermark}
            setIncludeWatermark={setIncludeWatermark}
            preview={preview}
            isLoadingPreview={isLoadingPreview}
            onGenerate={handleGenerate}
          />
        )}

        {/* Error state */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">
              {error.message || t('seller:ui.videoGenerator.failedToGenerateVideoPlease', 'Failed to generate video. Please try again.')}
            </p>
            <button
              onClick={reset}
              className="mt-2 text-red-700 underline text-sm"
            >
              {t('seller:ui.videoGenerator.tryAgain', 'Try Again')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Options form sub-component
interface VideoOptionsFormProps {
  format: VideoFormat;
  setFormat: (format: VideoFormat) => void;
  quality: VideoQuality;
  setQuality: (quality: VideoQuality) => void;
  duration: number;
  setDuration: (duration: number) => void;
  musicStyle: MusicStyle;
  setMusicStyle: (style: MusicStyle) => void;
  backgroundStyle: BackgroundStyle;
  setBackgroundStyle: (style: BackgroundStyle) => void;
  includeWatermark: boolean;
  setIncludeWatermark: (include: boolean) => void;
  preview: VideoPreview | undefined;
  isLoadingPreview: boolean;
  onGenerate: () => void;
}

const VideoOptionsForm: React.FC<VideoOptionsFormProps> = ({
  format,
  setFormat,
  quality,
  setQuality,
  duration,
  setDuration,
  musicStyle,
  setMusicStyle,
  backgroundStyle,
  setBackgroundStyle,
  includeWatermark,
  setIncludeWatermark,
  preview,
  isLoadingPreview,
  onGenerate,
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {/* Format selection */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">{t('seller:ui.videoGenerator.videoFormat', 'Video Format')}</label>
        <div className="grid grid-cols-3 gap-3">
          {FORMAT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFormat(option.value)}
              className={`p-4 rounded-lg border-2 transition-all text-center ${
                format === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <span className="text-2xl block mb-1">{option.icon}</span>
              <span className="text-sm font-medium block text-neutral-800">{t(`seller:ui.videoGenerator.format.${option.value}.label`, option.label)}</span>
              <span className="text-xs text-neutral-500">{t(`seller:ui.videoGenerator.format.${option.value}.description`, option.description)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quality selection */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">{t('seller:ui.videoGenerator.videoQuality', 'Video Quality')}</label>
        <div className="grid grid-cols-2 gap-3">
          {QUALITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setQuality(option.value)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                quality === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <span className="text-sm font-medium block text-neutral-800">{t(`seller:ui.videoGenerator.quality.${option.value}.label`, option.label)}</span>
              <span className="text-xs text-neutral-500">{t(`seller:ui.videoGenerator.quality.${option.value}.description`, option.description)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Background Style */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">{t('seller:ui.videoGenerator.backgroundStyle', 'Background Style')}</label>
        <div className="grid grid-cols-2 gap-3">
          {BACKGROUND_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setBackgroundStyle(option.value)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                backgroundStyle === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <span className="text-lg block mb-1">{option.icon}</span>
              <span className="text-sm font-medium block text-neutral-800">{t(`seller:ui.videoGenerator.background.${option.value}.label`, option.label)}</span>
              <span className="text-xs text-neutral-500">{t(`seller:ui.videoGenerator.background.${option.value}.description`, option.description)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Duration per image */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          {t('seller:ui.videoGenerator.durationPerImage', 'Duration per Image:')} {duration}s
        </label>
        <input
          type="range"
          min="2"
          max="10"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
          className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-xs text-neutral-500 mt-1">
          <span>{t('seller:ui.videoGenerator.n2sQuick', '2s (Quick)')}</span>
          <span>{t('seller:ui.videoGenerator.n10sSlow', '10s (Slow)')}</span>
        </div>
      </div>

      {/* Music style */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          <MusicNoteIcon className="w-4 h-4 inline-block mr-1" />
          {t('seller:ui.videoGenerator.backgroundMusic', 'Background Music')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {MUSIC_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setMusicStyle(option.value)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                musicStyle === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <span className="text-sm font-medium block text-neutral-800">{t(`seller:ui.videoGenerator.music.${option.value}.label`, option.label)}</span>
              <span className="text-xs text-neutral-500">{t(`seller:ui.videoGenerator.music.${option.value}.description`, option.description)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Watermark toggle */}
      <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
        <div>
          <span className="text-sm font-medium text-neutral-700">{t('seller:ui.videoGenerator.includeBalkanestateaiWatermark', 'Include BalkanEstateAI watermark')}</span>
          <p className="text-xs text-neutral-500">{t('seller:ui.videoGenerator.addsBrandingToYourVideo', 'Adds branding to your video for social sharing')}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={includeWatermark}
            onChange={(e) => setIncludeWatermark(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {/* Preview info */}
      {preview && !isLoadingPreview && (
        <div className="bg-neutral-50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-neutral-700 mb-2">{t('seller:ui.videoGenerator.videoPreview', 'Video Preview')}</h5>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-2xl font-bold text-primary">{preview.imageCount}</span>
              <p className="text-xs text-neutral-500">{t('seller:ui.videoGenerator.images', 'Images')}</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-primary">{preview.estimatedDuration}s</span>
              <p className="text-xs text-neutral-500">{t('seller:ui.videoGenerator.duration', 'Duration')}</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-primary">~{preview.estimatedSizeMB}MB</span>
              <p className="text-xs text-neutral-500">{t('seller:ui.videoGenerator.size', 'Size')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={onGenerate}
        className="w-full py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <VideoIcon className="w-5 h-5" />
        {t('seller:ui.videoGenerator.generateVideo', 'Generate Video')}
      </button>

      <p className="text-xs text-neutral-500 text-center">
        {t('seller:ui.videoGenerator.videoGenerationMayTake1', 'Video generation may take 1-3 minutes depending on the number of images.')}
      </p>
    </div>
  );
};

// Where sellers post the downloaded video. We host nothing — the listing links to the post.
const UPLOAD_PAGES: Record<'instagram' | 'tiktok' | 'youtube' | 'facebook', string> = {
  instagram: 'https://www.instagram.com/create/select/',
  tiktok: 'https://www.tiktok.com/upload',
  youtube: 'https://studio.youtube.com/channel/upload',
  facebook: 'https://www.facebook.com/reels/create/',
};

const PostToPlatforms: React.FC = () => {
  const { t } = useTranslation();
  const handleShare = useCallback((platform: keyof typeof UPLOAD_PAGES) => {
    window.open(UPLOAD_PAGES[platform], '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div className="border-t border-neutral-200 pt-6">
      <div className="flex items-center justify-center gap-2 mb-2">
        <ShareIcon className="w-5 h-5 text-neutral-500" />
        <h5 className="text-sm font-medium text-neutral-700">{t('seller:ui.videoGenerator.postItThenAddThe', 'Post it, then add the link to your listing')}</h5>
      </div>
      <p className="text-xs text-neutral-500 mb-4 text-center">
        {t('seller:ui.videoGenerator.uploadTheDownloadedFileTo', 'Upload the downloaded file to one of these, copy the post link, and paste it into your listing\'s video field.')}
      </p>

      <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto mb-4">
        {/* Instagram */}
        <button
          onClick={() => handleShare('instagram')}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 hover:opacity-90 transition-opacity group"
          title={t('seller:ui.videoGenerator.shareToInstagram', 'Share to Instagram')}
        >
          <InstagramIcon className="w-6 h-6 text-white" />
          <span className="text-[10px] font-medium text-white">Instagram</span>
        </button>

        {/* TikTok */}
        <button
          onClick={() => handleShare('tiktok')}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-black hover:bg-neutral-900 transition-colors group"
          title={t('seller:ui.videoGenerator.shareToTiktok', 'Share to TikTok')}
        >
          <TikTokIcon className="w-6 h-6 text-white" />
          <span className="text-[10px] font-medium text-white">TikTok</span>
        </button>

        {/* YouTube */}
        <button
          onClick={() => handleShare('youtube')}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-red-600 hover:bg-red-700 transition-colors group"
          title={t('seller:ui.videoGenerator.shareToYoutube', 'Share to YouTube')}
        >
          <YouTubeIcon className="w-6 h-6 text-white" />
          <span className="text-[10px] font-medium text-white">YouTube</span>
        </button>

        {/* Facebook */}
        <button
          onClick={() => handleShare('facebook')}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors group"
          title={t('seller:ui.videoGenerator.shareToFacebook', 'Share to Facebook')}
        >
          <FacebookIcon className="w-6 h-6 text-white" />
          <span className="text-[10px] font-medium text-white">Facebook</span>
        </button>
      </div>

    </div>
  );
};

export default VideoGenerator;

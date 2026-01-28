import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { useVideoPreview, useGenerateVideo, useDeleteVideo } from '../hooks/useVideoGeneration';
import { VideoFormat, MusicStyle, GeneratedVideo } from '../api/videoApi';

interface VideoGeneratorProps {
  property: Property;
  onVideoGenerated?: (video: GeneratedVideo) => void;
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

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

const VideoGenerator: React.FC<VideoGeneratorProps> = ({
  property,
  onVideoGenerated,
  onClose,
}) => {
  const { t } = useTranslation();

  // Video options state
  const [format, setFormat] = useState<VideoFormat>('vertical');
  const [duration, setDuration] = useState<number>(3);
  const [musicStyle, setMusicStyle] = useState<MusicStyle>('elegant');
  const [includeWatermark, setIncludeWatermark] = useState<boolean>(true);
  const [showVideoPreview, setShowVideoPreview] = useState<boolean>(false);

  // Fetch preview data
  const { data: preview, isLoading: isLoadingPreview } = useVideoPreview(property.id, { format, duration });

  // Video generation mutation
  const { generateVideo, isGenerating, progress, status, error, data: generatedVideo, reset } = useGenerateVideo({
    onSuccess: (video) => {
      if (onVideoGenerated) {
        onVideoGenerated(video);
      }
    },
  });

  // Delete video mutation
  const deleteVideoMutation = useDeleteVideo();

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
        duration,
        musicStyle,
        includeWatermark,
      },
      useAsync: imageCount > 5, // Use async for more than 5 images
    });
  }, [property.id, format, duration, musicStyle, includeWatermark, imageCount, generateVideo]);

  // Handle delete video
  const handleDelete = useCallback(() => {
    if (confirm('Are you sure you want to delete this video?')) {
      deleteVideoMutation.mutate(property.id);
    }
  }, [property.id, deleteVideoMutation]);

  // Handle download video
  const handleDownload = useCallback(() => {
    const videoUrl = generatedVideo?.url || property.videoUrl;
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  }, [generatedVideo, property.videoUrl]);

  const existingVideo = preview?.existingVideo || property.videoUrl;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <VideoIcon className="w-6 h-6 text-white" />
          <div>
            <h3 className="text-lg font-semibold text-white">Video Generator</h3>
            <p className="text-white/80 text-sm">Create a stunning video reel from your property photos</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <XIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {!hasImages ? (
          // No images warning
          <div className="text-center py-8">
            <VideoIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-neutral-700 mb-2">No Images Available</h4>
            <p className="text-neutral-500">
              Upload property images first to generate a video showcase.
            </p>
          </div>
        ) : isGenerating ? (
          // Generating state
          <div className="text-center py-8">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <SpinnerIcon className="w-24 h-24 text-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{Math.round(progress)}%</span>
              </div>
            </div>
            <h4 className="text-lg font-medium text-neutral-700 mb-2">
              {status === 'generating' ? 'Creating Your Video...' : 'Uploading Video...'}
            </h4>
            <p className="text-neutral-500 text-sm">
              This may take a few moments. Please don't close this window.
            </p>
            <div className="mt-4 w-full bg-neutral-200 rounded-full h-2 max-w-xs mx-auto">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : status === 'completed' && generatedVideo ? (
          // Success state
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-lg font-medium text-neutral-700 mb-2">Video Created Successfully!</h4>
            <p className="text-neutral-500 text-sm mb-6">
              Your {Math.round(generatedVideo.duration)}s video is ready to share.
            </p>

            {/* Video preview */}
            <div className="relative bg-neutral-900 rounded-lg overflow-hidden mb-6 max-w-md mx-auto aspect-video">
              <video
                src={generatedVideo.url}
                controls
                className="w-full h-full object-contain"
                poster={property.imageUrl}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                <DownloadIcon className="w-5 h-5" />
                Download
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Create Another
              </button>
            </div>
          </div>
        ) : existingVideo ? (
          // Existing video
          <div>
            <div className="mb-6">
              <h4 className="text-lg font-medium text-neutral-700 mb-2">Current Video</h4>
              <div className="relative bg-neutral-900 rounded-lg overflow-hidden aspect-video max-w-md">
                {showVideoPreview ? (
                  <video
                    src={existingVideo}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div
                    className="w-full h-full bg-cover bg-center cursor-pointer flex items-center justify-center"
                    style={{ backgroundImage: `url(${property.imageUrl})` }}
                    onClick={() => setShowVideoPreview(true)}
                  >
                    <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      <PlayIcon className="w-8 h-8 text-primary ml-1" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons for existing video */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                <DownloadIcon className="w-5 h-5" />
                Download
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteVideoMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <TrashIcon className="w-5 h-5" />
                Delete
              </button>
            </div>

            <div className="border-t border-neutral-200 pt-6">
              <h4 className="text-lg font-medium text-neutral-700 mb-4">Create New Video</h4>
              <VideoOptionsForm
                format={format}
                setFormat={setFormat}
                duration={duration}
                setDuration={setDuration}
                musicStyle={musicStyle}
                setMusicStyle={setMusicStyle}
                includeWatermark={includeWatermark}
                setIncludeWatermark={setIncludeWatermark}
                preview={preview}
                isLoadingPreview={isLoadingPreview}
                onGenerate={handleGenerate}
              />
            </div>
          </div>
        ) : (
          // Options form for new video
          <VideoOptionsForm
            format={format}
            setFormat={setFormat}
            duration={duration}
            setDuration={setDuration}
            musicStyle={musicStyle}
            setMusicStyle={setMusicStyle}
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
              {error.message || 'Failed to generate video. Please try again.'}
            </p>
            <button
              onClick={reset}
              className="mt-2 text-red-700 underline text-sm"
            >
              Try Again
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
  duration: number;
  setDuration: (duration: number) => void;
  musicStyle: MusicStyle;
  setMusicStyle: (style: MusicStyle) => void;
  includeWatermark: boolean;
  setIncludeWatermark: (include: boolean) => void;
  preview: any;
  isLoadingPreview: boolean;
  onGenerate: () => void;
}

const VideoOptionsForm: React.FC<VideoOptionsFormProps> = ({
  format,
  setFormat,
  duration,
  setDuration,
  musicStyle,
  setMusicStyle,
  includeWatermark,
  setIncludeWatermark,
  preview,
  isLoadingPreview,
  onGenerate,
}) => {
  return (
    <div className="space-y-6">
      {/* Format selection */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">Video Format</label>
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
              <span className="text-sm font-medium block text-neutral-800">{option.label}</span>
              <span className="text-xs text-neutral-500">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Duration per image */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          Duration per Image: {duration}s
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
          <span>2s (Quick)</span>
          <span>10s (Slow)</span>
        </div>
      </div>

      {/* Music style */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          <MusicNoteIcon className="w-4 h-4 inline-block mr-1" />
          Background Music
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
              <span className="text-sm font-medium block text-neutral-800">{option.label}</span>
              <span className="text-xs text-neutral-500">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Watermark toggle */}
      <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
        <div>
          <span className="text-sm font-medium text-neutral-700">Include BalkanEstate.com watermark</span>
          <p className="text-xs text-neutral-500">Adds branding to your video</p>
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
          <h5 className="text-sm font-medium text-neutral-700 mb-2">Video Preview</h5>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-2xl font-bold text-primary">{preview.imageCount}</span>
              <p className="text-xs text-neutral-500">Images</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-primary">{preview.estimatedDuration}s</span>
              <p className="text-xs text-neutral-500">Duration</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-primary">~{preview.estimatedSizeMB}MB</span>
              <p className="text-xs text-neutral-500">Size</p>
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
        Generate Video
      </button>

      <p className="text-xs text-neutral-500 text-center">
        Video generation may take 1-3 minutes depending on the number of images.
      </p>
    </div>
  );
};

export default VideoGenerator;

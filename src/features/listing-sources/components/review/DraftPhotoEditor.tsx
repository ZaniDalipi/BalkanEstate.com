import React from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';

interface DraftPhotoEditorProps {
  images: string[];
  onChange: (images: string[]) => void;
}

/** Remove photos the feed picked up by mistake, or choose a different cover. */
const DraftPhotoEditor: React.FC<DraftPhotoEditorProps> = ({ images, onChange }) => {
  const { t } = useTranslation('listingFeeds');
  if (images.length === 0) {
    return <p className="text-sm text-gray-500">{t('review.noPhotos')}</p>;
  }

  return (
    <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {images.map((url, i) => (
        <li key={url} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-[4/3]">
          <img src={optimizeCloudinaryUrl(url, { width: 240, quality: 'auto' })} alt="" loading="lazy" className="w-full h-full object-cover" />
          {i === 0 && (
            <span className="absolute left-1 top-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">★</span>
          )}
          <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-gradient-to-t from-black/60 to-transparent">
            {i > 0 ? (
              <button
                type="button"
                onClick={() => onChange([url, ...images.filter((u) => u !== url)])}
                className="px-1.5 py-0.5 rounded bg-white/90 text-[10px] font-medium text-gray-800"
              >
                {t('review.makeCover')}
              </button>
            ) : <span />}
            <button
              type="button"
              onClick={() => onChange(images.filter((u) => u !== url))}
              aria-label={t('review.removePhoto')}
              title={t('review.removePhoto')}
              className="w-6 h-6 rounded bg-white/90 text-red-600 font-bold leading-none"
            >
              ×
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default DraftPhotoEditor;

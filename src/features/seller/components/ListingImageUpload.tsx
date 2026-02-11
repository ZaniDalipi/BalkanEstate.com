import React from 'react';
import { useTranslation } from 'react-i18next';
import { SpinnerIcon } from '@/constants';
import { ListingData, ImageData, ALL_VALID_TAGS, UploadIcon, InfoIcon, ImageTagSelector } from './ListingFormHelpers';

interface ListingImageUploadProps {
    images: ImageData[];
    listingData: ListingData;
    floorplanImage: ImageData;
    isCompressing: boolean;
    isUploading: boolean;
    isSubmitting: boolean;
    uploadProgress: number;
    handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFloorplanImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    removeImage: (index: number) => void;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    handleDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    handleDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDrop: () => void;
    handleImageTagChange: (index: number, tag: string) => void;
    setFloorplanImage: React.Dispatch<React.SetStateAction<ImageData>>;
}

const ListingImageUpload: React.FC<ListingImageUploadProps> = ({
    images,
    listingData,
    floorplanImage,
    isCompressing,
    isUploading,
    isSubmitting,
    uploadProgress,
    handleImageChange,
    handleFloorplanImageChange,
    removeImage,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    handleDrop,
    handleImageTagChange,
    setFloorplanImage,
}) => {
    const { t } = useTranslation(['newListing', 'seller', 'common']);

    return (
        <>
            {/* Image Management */}
            <fieldset>
                <label className="block text-sm font-medium text-neutral-700 mb-1">{t('seller:createListing.imageManagement.title')}</label>
                <div className="p-4 border rounded-lg bg-neutral-50/70">
                     <label htmlFor="image-upload-manual" className="flex flex-col items-center justify-center w-full h-32 border-2 border-neutral-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-neutral-50 mb-4">
                        <div className="flex flex-col items-center justify-center">
                            <UploadIcon className="w-8 h-8 mb-2 text-neutral-400" />
                            <p className="text-sm text-neutral-500">{images.length > 0 ? t('seller:createListing.upload.uploadMore') : t('seller:createListing.upload.uploadProperty')}</p>
                        </div>
                        <input id="image-upload-manual" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>

                    {images.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 bg-blue-100 text-blue-800 text-sm p-3 rounded-lg mb-4">
                                <InfoIcon className="w-8 h-8 flex-shrink-0"/>
                                <p>{t('seller:createListing.imageManagement.dragToReorder')}</p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4" role="list" aria-label={t('seller:createListing.imageManagement.imageList', 'Uploaded images')}>
                                {images.map((img, index) => (
                                    <div
                                        key={img.previewUrl}
                                        className="relative group cursor-grab"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragEnter={(e) => handleDragEnter(e, index)}
                                        onDragEnd={handleDragEnd}
                                        onDrop={handleDrop}
                                        onDragOver={(e) => e.preventDefault()}
                                        role="listitem"
                                        aria-label={t('seller:createListing.imageManagement.imageItem', 'Image {{number}} of {{total}}. Drag to reorder.', { number: index + 1, total: images.length })}
                                    >
                                        <img
                                            src={img.previewUrl}
                                            alt={t('seller:createListing.imageManagement.imagePreview', 'Property image {{number}}', { number: index + 1 })}
                                            className="w-full h-24 object-cover rounded-md mb-2 border"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 min-h-[24px] min-w-[24px] flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                            aria-label={t('seller:createListing.imageManagement.removeImage', 'Remove image {{number}}', { number: index + 1 })}
                                        >
                                            &times;
                                        </button>
                                        <ImageTagSelector
                                            value={listingData.image_tags.find(t => t.index === index)?.tag || 'other'}
                                            options={ALL_VALID_TAGS}
                                            onChange={(tag) => handleImageTagChange(index, tag)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </fieldset>

            {/* Floorplan Upload */}
            <div>
                <h4 className="font-semibold text-neutral-800 mb-2 mt-4">{t('seller:createListing.floorPlan.title')}</h4>
                <label htmlFor="floorplan-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-neutral-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-neutral-50">
                    <div className="flex flex-col items-center justify-center"><UploadIcon className="w-8 h-8 mb-2 text-neutral-400" /><p className="text-sm text-neutral-500">{t('seller:createListing.upload.uploadFloorplan')}</p></div>
                    <input id="floorplan-upload" type="file" accept="image/*" className="hidden" onChange={handleFloorplanImageChange} />
                </label>
                {floorplanImage.previewUrl && (
                    <div className="mt-2 relative inline-block">
                        <img
                            src={floorplanImage.previewUrl}
                            alt={t('seller:createListing.floorPlan.preview', 'Floor plan preview')}
                            className="w-32 h-32 object-cover rounded-md"
                            loading="lazy"
                            decoding="async"
                        />
                        <button
                            type="button"
                            onClick={() => setFloorplanImage({file: null, previewUrl: ''})}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 min-h-[24px] min-w-[24px] flex items-center justify-center text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            aria-label={t('seller:createListing.floorPlan.remove', 'Remove floor plan')}
                        >
                            &times;
                        </button>
                    </div>
                )}
            </div>

            {/* Progress Indicators */}
            <div aria-live="polite" aria-atomic="true" role="status">
                {(isCompressing || isUploading || isSubmitting) && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                            <SpinnerIcon className="w-5 h-5 text-blue-600 animate-spin" aria-hidden="true" />
                            <span className="text-sm font-semibold text-blue-800">
                                {isCompressing && t('seller:createListing.progress.compressing')}
                                {isUploading && t('seller:createListing.progress.uploading')}
                                {isSubmitting && !isUploading && t('seller:createListing.progress.creating')}
                            </span>
                        </div>
                        {isUploading && (
                            <div className="w-full bg-blue-200 rounded-full h-2" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100} aria-label={t('seller:createListing.progress.uploadProgress', 'Upload progress: {{percent}}%', { percent: uploadProgress })}>
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default ListingImageUpload;

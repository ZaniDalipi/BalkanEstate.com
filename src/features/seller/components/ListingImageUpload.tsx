import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FloorplanSpot } from '@/types';
import FloorPlanPhotoPlacer from './FloorPlanPhotoPlacer';
import { ImageData, ALL_VALID_TAGS, UploadIcon, InfoIcon, ImageTagSelector, FieldError, RequiredMark, fieldAnchorId } from './ListingFormHelpers';

interface ListingImageUploadProps {
    /** Validation message shown when no photo has been added yet. */
    imagesError?: string;
    images: ImageData[];
    imageTags: { index: number; tag: string }[];
    floorplanImage: ImageData;
    handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFloorplanImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    removeImage: (index: number) => void;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    handleDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    handleDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDrop: () => void;
    handleImageTagChange: (index: number, tag: string) => void;
    setFloorplanImage: React.Dispatch<React.SetStateAction<ImageData>>;
    /** Save where each photo was taken on the floor plan (index-aligned). */
    setPhotoSpots?: (spots: (FloorplanSpot | undefined)[]) => void;
}

const ListingImageUpload: React.FC<ListingImageUploadProps> = memo(({
    imagesError,
    images,
    imageTags,
    floorplanImage,
    handleImageChange,
    handleFloorplanImageChange,
    removeImage,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    handleDrop,
    handleImageTagChange,
    setFloorplanImage,
    setPhotoSpots,
}) => {
    const { t } = useTranslation(['newListing', 'seller', 'common']);
    const [isPlacingPhotos, setIsPlacingPhotos] = useState(false);
    const placedCount = images.filter(img => img.floorplanSpot).length;
    const canPlacePhotos = !!setPhotoSpots && !!floorplanImage.previewUrl && images.length > 0;

    return (
        <>
            {/* Image Management */}
            <fieldset className="overflow-visible relative z-20" id={fieldAnchorId('images')}>
                <label className={`block text-sm font-medium mb-1 ${imagesError ? 'text-red-600' : 'text-gray-500'}`}>
                    {t('seller:createListing.imageManagement.title')}<RequiredMark />
                </label>
                <div className={`p-4 glass-fieldset overflow-visible ${imagesError ? '!border-red-500' : ''}`}>
                     <label htmlFor="image-upload-manual" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer glass-fieldset transition-colors mb-4 ${imagesError ? 'border-red-500 bg-red-50/60 hover:bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex flex-col items-center justify-center">
                            <UploadIcon className={`w-8 h-8 mb-2 ${imagesError ? 'text-red-400' : 'text-gray-300'}`} />
                            <p className={`text-sm ${imagesError ? 'text-red-600' : 'text-gray-400'}`}>{images.length > 0 ? t('seller:createListing.upload.uploadMore') : t('seller:createListing.upload.uploadProperty')}</p>
                        </div>
                        <input id="image-upload-manual" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} aria-invalid={!!imagesError} aria-required="true" />
                    </label>
                    <FieldError message={imagesError} className="mb-3" />
                    {!imagesError && images.length === 0 && (
                        <p className="mb-3 text-xs text-gray-400">
                            {t('newListing:validation.atLeastOnePhoto', 'At least one photo is required to publish a listing.')}
                        </p>
                    )}

                    {images.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 glass-fieldset border-blue-200 text-blue-600 text-sm p-3 mb-4">
                                <InfoIcon className="w-8 h-8 flex-shrink-0"/>
                                <p>{t('seller:createListing.imageManagement.dragToReorder')}</p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 overflow-visible">
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
                                    >
                                        <img src={img.previewUrl} alt={`preview ${index}`} className="w-full h-24 object-cover rounded-lg mb-2 border border-gray-200" />
                                        <button type="button" aria-label="Remove image" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500/80 backdrop-blur-sm text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10">&times;</button>
                                        <ImageTagSelector
                                            value={imageTags.find(t => t.index === index)?.tag || 'other'}
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
                <h4 className="font-semibold text-gray-600 mb-2 mt-4">{t('seller:createListing.floorPlan.title')}</h4>
                <label htmlFor="floorplan-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer glass-fieldset hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center justify-center"><UploadIcon className="w-8 h-8 mb-2 text-gray-300" /><p className="text-sm text-gray-400">{t('seller:createListing.upload.uploadFloorplan')}</p></div>
                    <input id="floorplan-upload" type="file" accept="image/*" className="hidden" onChange={handleFloorplanImageChange} />
                </label>
                {floorplanImage.previewUrl && (
                    <div className="mt-2 flex flex-wrap items-start gap-3">
                        <div className="relative inline-block"><img src={floorplanImage.previewUrl} alt="floorplan" className="w-32 h-32 object-cover rounded-lg border border-gray-200" /><button type="button" aria-label="Remove floorplan" onClick={() => setFloorplanImage({file: null, previewUrl: ''})} className="absolute -top-1 -right-1 bg-red-500/80 backdrop-blur-sm text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button></div>
                        {canPlacePhotos && (
                            <div className="flex-1 min-w-[200px] p-3 rounded-xl border border-blue-200 bg-blue-50/60">
                                <p className="text-sm font-semibold text-gray-700">
                                    {t('seller:createListing.photoSpots.cta', 'Show buyers where each photo was taken')}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {t('seller:createListing.photoSpots.ctaHint', 'Buyers see a camera on the floor plan for each photo, in sync as they browse.')}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsPlacingPhotos(true)}
                                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                                >
                                    {placedCount > 0
                                        ? t('seller:createListing.photoSpots.edit', 'Edit photo spots ({{placed}}/{{total}})', { placed: placedCount, total: images.length })
                                        : t('seller:createListing.photoSpots.start', 'Place photos on floor plan')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {isPlacingPhotos && canPlacePhotos && (
                    <FloorPlanPhotoPlacer
                        floorplanUrl={floorplanImage.previewUrl}
                        photos={images.map((img, index) => ({
                            url: img.previewUrl,
                            tag: imageTags.find(tg => tg.index === index)?.tag,
                            floorplanSpot: img.floorplanSpot,
                        }))}
                        onSave={setPhotoSpots!}
                        onClose={() => setIsPlacingPhotos(false)}
                    />
                )}
            </div>

            {/* Submission progress is shown as a full-screen overlay (ListingSubmitOverlay)
                rendered by the parent form, so no inline indicator is needed here. */}
        </>
    );
});

export default ListingImageUpload;

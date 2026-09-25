import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FloorplanSpot } from '@/types';
import FloorPlanPhotoPlacer from './FloorPlanPhotoPlacer';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { XMarkIcon } from '@/constants';
import { ImageData, FloorPlanDraft, ALL_VALID_TAGS, UploadIcon, InfoIcon, ImageTagSelector, FieldError, RequiredMark, fieldAnchorId } from './ListingFormHelpers';

interface ListingImageUploadProps {
    /** Validation message shown when no photo has been added yet. */
    imagesError?: string;
    images: ImageData[];
    imageTags: { index: number; tag: string }[];
    floorplans: FloorPlanDraft[];
    handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFloorplanImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    removeImage: (index: number) => void;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    handleDragEnter: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
    handleDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDrop: () => void;
    handleImageTagChange: (index: number, tag: string) => void;
    removeFloorplan: (index: number) => void;
    renameFloorplan: (index: number, label: string) => void;
    replaceFloorplan: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
    /** Save where each photo was taken on the floor plan (index-aligned). */
    setPhotoSpots?: (spots: (FloorplanSpot | undefined)[]) => void;
}

const ListingImageUpload: React.FC<ListingImageUploadProps> = memo(({
    imagesError,
    images,
    imageTags,
    floorplans,
    handleImageChange,
    handleFloorplanImageChange,
    removeImage,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    handleDrop,
    handleImageTagChange,
    removeFloorplan,
    renameFloorplan,
    replaceFloorplan,
    setPhotoSpots,
}) => {
    const { t } = useTranslation(['newListing', 'seller', 'common']);
    const [isPlacingPhotos, setIsPlacingPhotos] = useState(false);
    const placedCount = images.filter(img => img.floorplanSpot).length;
    const canPlacePhotos = !!setPhotoSpots && floorplans.length > 0 && images.length > 0;

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
                                        {/* Always shown on touch screens (no hover there); on hover or keyboard focus with a mouse. */}
                                        <button
                                            type="button"
                                            aria-label={t('seller:createListing.imageManagement.removePhoto', 'Delete photo {{n}}', { n: index + 1 })}
                                            title={t('seller:createListing.imageManagement.removePhoto', 'Delete photo {{n}}', { n: index + 1 })}
                                            onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            draggable={false}
                                            className="absolute top-1.5 right-1.5 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-red-500/90 hover:bg-red-600 text-white shadow-md transition-opacity opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
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

            {/* Floor plans — one per floor */}
            <div>
                <h4 className="font-semibold text-gray-600 mb-1 mt-4">{t('seller:createListing.floorPlan.title')}</h4>
                <p className="text-xs text-gray-400 mb-2">
                    {t('seller:createListing.floors.hint', 'Add a plan for each floor (Floor 1, Floor 2, Attic, Basement…).')}
                </p>

                {floorplans.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                        {floorplans.map((floor, index) => (
                            <div key={floor.previewUrl} className="relative rounded-xl border border-gray-200 bg-white overflow-hidden">
                                <img src={optimizeCloudinaryUrl(floor.previewUrl, { width: 400, quality: 'auto' }) || floor.previewUrl} alt="" className="w-full h-28 object-contain bg-gray-50" />
                                <button
                                    type="button"
                                    aria-label={t('seller:createListing.floors.remove', 'Remove floor plan')}
                                    onClick={() => removeFloorplan(index)}
                                    className="absolute top-1.5 right-1.5 bg-red-500/85 text-white rounded-full w-6 h-6 flex items-center justify-center"
                                >
                                    <XMarkIcon className="w-3.5 h-3.5" />
                                </button>
                                <div className="flex items-center gap-1 p-2 border-t border-gray-100">
                                    <input
                                        type="text"
                                        value={floor.label}
                                        maxLength={40}
                                        onChange={(e) => renameFloorplan(index, e.target.value)}
                                        placeholder={t('seller:createListing.floors.defaultLabel', 'Floor {{n}}', { n: index + 1 })}
                                        aria-label={t('seller:createListing.floors.name', 'Floor name')}
                                        className="min-w-0 flex-1 text-sm px-2 py-1 rounded-md border border-gray-200 focus:border-blue-400 focus:outline-none"
                                    />
                                    <label
                                        className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-700 cursor-pointer px-1.5 py-1"
                                        title={t('seller:createListing.floors.replace', 'Replace image')}
                                    >
                                        {t('seller:createListing.floors.replaceShort', 'Replace')}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => replaceFloorplan(index, e)} />
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <label htmlFor="floorplan-upload" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer glass-fieldset hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center justify-center"><UploadIcon className="w-7 h-7 mb-1 text-gray-300" /><p className="text-sm text-gray-400">{floorplans.length > 0 ? t('seller:createListing.floors.add', 'Add another floor plan') : t('seller:createListing.upload.uploadFloorplan')}</p></div>
                    <input id="floorplan-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleFloorplanImageChange} />
                </label>

                {canPlacePhotos && (
                    <div className="mt-3 p-3 rounded-xl border border-blue-200 bg-blue-50/60">
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
                {isPlacingPhotos && canPlacePhotos && (
                    <FloorPlanPhotoPlacer
                        floors={floorplans.map((f, i) => ({ url: f.previewUrl, label: f.label || t('seller:createListing.floors.defaultLabel', 'Floor {{n}}', { n: i + 1 }) }))}
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

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
                <label className="block text-sm font-medium text-white/60 mb-1">{t('seller:createListing.imageManagement.title')}</label>
                <div className="p-4 glass-fieldset">
                     <label htmlFor="image-upload-manual" className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/10 border-dashed rounded-xl cursor-pointer glass-fieldset hover:bg-white/5 transition-colors mb-4">
                        <div className="flex flex-col items-center justify-center">
                            <UploadIcon className="w-8 h-8 mb-2 text-white/30" />
                            <p className="text-sm text-white/50">{images.length > 0 ? t('seller:createListing.upload.uploadMore') : t('seller:createListing.upload.uploadProperty')}</p>
                        </div>
                        <input id="image-upload-manual" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>

                    {images.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 glass-fieldset border-blue-400/15 text-blue-300/80 text-sm p-3 mb-4">
                                <InfoIcon className="w-8 h-8 flex-shrink-0"/>
                                <p>{t('seller:createListing.imageManagement.dragToReorder')}</p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
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
                                        <img src={img.previewUrl} alt={`preview ${index}`} className="w-full h-24 object-cover rounded-lg mb-2 border border-white/10" />
                                        <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500/80 backdrop-blur-sm text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10">&times;</button>
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
                <h4 className="font-semibold text-white/70 mb-2 mt-4">{t('seller:createListing.floorPlan.title')}</h4>
                <label htmlFor="floorplan-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/10 border-dashed rounded-xl cursor-pointer glass-fieldset hover:bg-white/5 transition-colors">
                    <div className="flex flex-col items-center justify-center"><UploadIcon className="w-8 h-8 mb-2 text-white/30" /><p className="text-sm text-white/50">{t('seller:createListing.upload.uploadFloorplan')}</p></div>
                    <input id="floorplan-upload" type="file" accept="image/*" className="hidden" onChange={handleFloorplanImageChange} />
                </label>
                {floorplanImage.previewUrl && (
                    <div className="mt-2 relative inline-block"><img src={floorplanImage.previewUrl} alt="floorplan" className="w-32 h-32 object-cover rounded-lg border border-white/10" /><button type="button" onClick={() => setFloorplanImage({file: null, previewUrl: ''})} className="absolute -top-1 -right-1 bg-red-500/80 backdrop-blur-sm text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button></div>
                )}
            </div>

            {/* Progress Indicators */}
            {(isCompressing || isUploading || isSubmitting) && (
                <div className="mt-6 p-4 glass-fieldset border-blue-400/20">
                    <div className="flex items-center gap-3 mb-2">
                        <SpinnerIcon className="w-5 h-5 text-blue-400 animate-spin" />
                        <span className="text-sm font-semibold text-blue-300">
                            {isCompressing && t('seller:createListing.progress.compressing')}
                            {isUploading && t('seller:createListing.progress.uploading')}
                            {isSubmitting && !isUploading && t('seller:createListing.progress.creating')}
                        </span>
                    </div>
                    {isUploading && (
                        <div className="w-full bg-white/10 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default ListingImageUpload;

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SpinnerIcon } from '@/constants';
import { FloorPlanAnnotation, FloorPlanAnnotationIcon } from '@/types';
import { ListingData, ImageData, ALL_VALID_TAGS, UploadIcon, InfoIcon, ImageTagSelector } from './ListingFormHelpers';

// ── Annotation icon options ──────────────────────────────────────────────────
const ANNOTATION_ICON_OPTIONS: { value: FloorPlanAnnotationIcon; emoji: string; label: string }[] = [
    { value: 'bedroom', emoji: '🛏', label: 'Bedroom' },
    { value: 'bathroom', emoji: '🚿', label: 'Bathroom' },
    { value: 'kitchen', emoji: '🍳', label: 'Kitchen' },
    { value: 'living', emoji: '🛋', label: 'Living Room' },
    { value: 'dining', emoji: '🍽', label: 'Dining Room' },
    { value: 'garage', emoji: '🚗', label: 'Garage' },
    { value: 'garden', emoji: '🌿', label: 'Garden' },
    { value: 'office', emoji: '💼', label: 'Office' },
    { value: 'storage', emoji: '📦', label: 'Storage' },
    { value: 'balcony', emoji: '🌅', label: 'Balcony' },
];

const EMOJI_MAP: Record<string, string> = Object.fromEntries(
    ANNOTATION_ICON_OPTIONS.map(({ value, emoji }) => [value, emoji])
);

// ── Pending pin state while user fills the form ──────────────────────────────
interface PendingPin {
    x: number;
    y: number;
}

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
    floorplanAnnotations: FloorPlanAnnotation[];
    setFloorplanAnnotations: React.Dispatch<React.SetStateAction<FloorPlanAnnotation[]>>;
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
    floorplanAnnotations,
    setFloorplanAnnotations,
}) => {
    const { t } = useTranslation(['newListing', 'seller', 'common']);

    // Annotation editor state
    const [pendingPin, setPendingPin] = useState<PendingPin | null>(null);
    const [pinLabel, setPinLabel] = useState('');
    const [pinSize, setPinSize] = useState('');
    const [pinIcon, setPinIcon] = useState<FloorPlanAnnotationIcon>('bedroom');
    const [isAddingPin, setIsAddingPin] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Click on the floor plan image to place a pin
    const handleFloorplanClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isAddingPin) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setPendingPin({ x, y });
        setPinLabel('');
        setPinSize('');
        setPinIcon('bedroom');
    };

    const confirmPin = () => {
        if (!pendingPin || !pinLabel.trim()) return;
        const newPin: FloorPlanAnnotation = {
            id: `pin-${Date.now()}`,
            x: pendingPin.x,
            y: pendingPin.y,
            label: pinLabel.trim(),
            size: pinSize.trim() || undefined,
            icon: pinIcon,
        };
        setFloorplanAnnotations((prev) => [...prev, newPin]);
        setPendingPin(null);
        setPinLabel('');
        setPinSize('');
    };

    const cancelPin = () => {
        setPendingPin(null);
        setPinLabel('');
        setPinSize('');
    };

    const removePin = (id: string) => {
        setFloorplanAnnotations((prev) => prev.filter((p) => p.id !== id));
    };

    return (
        <>
            {/* ── Image Management ─────────────────────────────────────────── */}
            <fieldset>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('seller:createListing.imageManagement.title')}
                </label>
                <div className="p-4 glass-fieldset">
                    <label
                        htmlFor="image-upload-manual"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer glass-fieldset hover:bg-gray-50 transition-colors mb-4"
                    >
                        <div className="flex flex-col items-center justify-center">
                            <UploadIcon className="w-8 h-8 mb-2 text-gray-300" />
                            <p className="text-sm text-gray-400">
                                {images.length > 0
                                    ? t('seller:createListing.upload.uploadMore')
                                    : t('seller:createListing.upload.uploadProperty')}
                            </p>
                        </div>
                        <input
                            id="image-upload-manual"
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                        />
                    </label>

                    {images.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 glass-fieldset border-blue-200 text-blue-600 text-sm p-3 mb-4">
                                <InfoIcon className="w-8 h-8 flex-shrink-0" />
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
                                        <img
                                            src={img.previewUrl}
                                            alt={`preview ${index}`}
                                            className="w-full h-24 object-cover rounded-lg mb-2 border border-gray-200"
                                        />
                                        <button
                                            type="button"
                                            aria-label="Remove image"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500/80 backdrop-blur-sm text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        >
                                            &times;
                                        </button>
                                        <ImageTagSelector
                                            value={listingData.image_tags.find((t) => t.index === index)?.tag || 'other'}
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

            {/* ── Floor Plan Upload ────────────────────────────────────────── */}
            <div>
                <h4 className="font-semibold text-gray-600 mb-2 mt-4">
                    {t('seller:createListing.floorPlan.title')}
                </h4>

                {!floorplanImage.previewUrl ? (
                    <label
                        htmlFor="floorplan-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer glass-fieldset hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex flex-col items-center justify-center">
                            <UploadIcon className="w-8 h-8 mb-2 text-gray-300" />
                            <p className="text-sm text-gray-400">
                                {t('seller:createListing.upload.uploadFloorplan')}
                            </p>
                        </div>
                        <input
                            id="floorplan-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFloorplanImageChange}
                        />
                    </label>
                ) : (
                    /* ── Annotation editor ─────────────────────────────────── */
                    <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                        {/* Header */}
                        <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-100">
                            <span className="text-sm font-semibold text-gray-600">
                                Floor Plan
                                {floorplanAnnotations.length > 0 && (
                                    <span className="ml-2 text-xs font-normal text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                                        {floorplanAnnotations.length} room{floorplanAnnotations.length !== 1 ? 's' : ''} marked
                                    </span>
                                )}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsAddingPin((v) => !v); setPendingPin(null); }}
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                                        isAddingPin
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                    }`}
                                >
                                    {isAddingPin ? '✕ Cancel' : '＋ Mark Room'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setFloorplanImage({ file: null, previewUrl: '' }); setFloorplanAnnotations([]); }}
                                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                                    aria-label="Remove floor plan"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>

                        {isAddingPin && !pendingPin && (
                            <div className="px-3 py-1.5 bg-indigo-50 border-b border-indigo-100">
                                <p className="text-xs text-indigo-600 font-medium">
                                    Click anywhere on the floor plan to place a room marker
                                </p>
                            </div>
                        )}

                        {/* Image with pin overlay */}
                        <div
                            ref={overlayRef}
                            className="relative"
                            style={{ cursor: isAddingPin && !pendingPin ? 'crosshair' : 'default' }}
                            onClick={handleFloorplanClick}
                        >
                            <img
                                src={floorplanImage.previewUrl}
                                alt="Floor plan"
                                className="w-full object-contain max-h-72 select-none"
                                onDragStart={(e) => e.preventDefault()}
                            />

                            {/* Existing pins */}
                            {floorplanAnnotations.map((pin) => (
                                <div
                                    key={pin.id}
                                    style={{
                                        position: 'absolute',
                                        left: `${pin.x}%`,
                                        top: `${pin.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '1.4rem',
                                            height: '1.4rem',
                                            borderRadius: '50%',
                                            background: 'rgba(99,102,241,0.9)',
                                            border: '2px solid white',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.65rem',
                                        }}
                                    >
                                        {EMOJI_MAP[pin.icon] ?? '📍'}
                                    </div>
                                </div>
                            ))}

                            {/* Pending pin drop marker */}
                            {pendingPin && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: `${pendingPin.x}%`,
                                        top: `${pendingPin.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '1.4rem',
                                            height: '1.4rem',
                                            borderRadius: '50%',
                                            background: 'rgba(239,68,68,0.9)',
                                            border: '2px solid white',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                            animation: 'pulse 1s ease infinite',
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Pin form */}
                        {pendingPin && (
                            <div className="p-3 bg-white border-t border-gray-100 space-y-2">
                                <p className="text-xs font-semibold text-gray-500 mb-1">Room details</p>

                                {/* Icon selector */}
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {ANNOTATION_ICON_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setPinIcon(opt.value)}
                                            title={opt.label}
                                            className={`text-base px-1.5 py-0.5 rounded-lg border transition-all ${
                                                pinIcon === opt.value
                                                    ? 'border-indigo-400 bg-indigo-50 scale-110'
                                                    : 'border-gray-200 hover:border-indigo-200'
                                            }`}
                                        >
                                            {opt.emoji}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={pinLabel}
                                        onChange={(e) => setPinLabel(e.target.value)}
                                        placeholder="Room name (e.g. Master Bedroom)"
                                        className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-300"
                                        autoFocus
                                        onKeyDown={(e) => { if (e.key === 'Enter') confirmPin(); if (e.key === 'Escape') cancelPin(); }}
                                    />
                                    <input
                                        type="text"
                                        value={pinSize}
                                        onChange={(e) => setPinSize(e.target.value)}
                                        placeholder="Size (e.g. 18m²)"
                                        className="w-28 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-300"
                                    />
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={confirmPin}
                                        disabled={!pinLabel.trim()}
                                        className="flex-1 text-sm font-semibold bg-indigo-500 text-white rounded-lg py-1.5 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Add Pin
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelPin}
                                        className="px-3 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg py-1.5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Existing annotations list */}
                        {floorplanAnnotations.length > 0 && !pendingPin && (
                            <div className="px-3 pb-3 pt-2 bg-white border-t border-gray-100">
                                <p className="text-xs font-semibold text-gray-400 mb-2">Marked rooms</p>
                                <div className="flex flex-wrap gap-2">
                                    {floorplanAnnotations.map((pin) => (
                                        <div
                                            key={pin.id}
                                            className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-1 text-xs text-indigo-700"
                                        >
                                            <span>{EMOJI_MAP[pin.icon]}</span>
                                            <span className="font-medium">{pin.label}</span>
                                            {pin.size && <span className="text-indigo-400">{pin.size}</span>}
                                            <button
                                                type="button"
                                                onClick={() => removePin(pin.id)}
                                                className="ml-1 text-indigo-300 hover:text-red-400 transition-colors leading-none"
                                                aria-label={`Remove ${pin.label}`}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Progress Indicators ──────────────────────────────────────── */}
            {(isCompressing || isUploading || isSubmitting) && (
                <div className="mt-6 p-4 glass-fieldset border-blue-200" aria-live="polite">
                    <div className="flex items-center gap-3 mb-2">
                        <SpinnerIcon className="w-5 h-5 text-blue-600 animate-spin" />
                        <span className="text-sm font-semibold text-blue-600">
                            {isCompressing && t('seller:createListing.progress.compressing')}
                            {isUploading && t('seller:createListing.progress.uploading')}
                            {isSubmitting && !isUploading && t('seller:createListing.progress.creating')}
                        </span>
                    </div>
                    {isUploading && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
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

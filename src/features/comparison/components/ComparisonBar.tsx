import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { BuildingOfficeIcon, XMarkIcon } from '@/constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';

const MAX_COMPARE = 5;

interface ComparisonBarProps {
    properties: Property[];
    onCompareNow: () => void;
    onRemove: (id: string) => void;
    onClear: () => void;
}

const CompareImage: React.FC<{ prop: Property; onRemove: (id: string) => void }> = ({ prop, onRemove }) => {
    const [error, setError] = useState(!prop.imageUrl);
    useEffect(() => { setError(!prop.imageUrl); }, [prop.imageUrl]);

    return (
        <div className="relative group flex-shrink-0">
            <div className="w-11 h-11 rounded-full border-2 border-white shadow-md overflow-hidden">
                {error || !prop.imageUrl ? (
                    <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
                        <BuildingOfficeIcon className="w-5 h-5 text-neutral-400" />
                    </div>
                ) : (
                    <img
                        src={optimizeCloudinaryUrl(prop.imageUrl, { width: 80, quality: 'auto', crop: 'thumb' })}
                        alt={prop.address}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                        onError={() => setError(true)}
                    />
                )}
            </div>
            <button
                onClick={() => onRemove(prop.id)}
                aria-label={`Remove ${prop.address}`}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            >
                <XMarkIcon className="w-3 h-3" />
            </button>
        </div>
    );
};

const EmptySlot: React.FC = () => (
    <div className="w-11 h-11 rounded-full border-2 border-dashed border-neutral-300/70 flex items-center justify-center flex-shrink-0">
        <span className="text-neutral-300 text-base font-light leading-none">+</span>
    </div>
);

const ComparisonBar: React.FC<ComparisonBarProps> = ({ properties, onCompareNow, onRemove, onClear }) => {
    const { t } = useTranslation(['search']);
    const propertyCount = properties.length;
    const emptySlots = MAX_COMPARE - propertyCount;
    const canCompare = propertyCount >= 2;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-t border-white/30 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-3 pt-3"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-auto flex items-center gap-3 flex-grow min-w-0">
                    <div className="flex items-center -space-x-2 flex-shrink-0">
                        {properties.map(prop => (
                            <CompareImage key={prop.id} prop={prop} onRemove={onRemove} />
                        ))}
                        {emptySlots > 0 && (
                            <div className="hidden sm:contents">
                                {Array.from({ length: emptySlots }).map((_, i) => (
                                    <EmptySlot key={`empty-${i}`} />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-neutral-800 truncate">{t('search:compare.title')}</h3>
                        <p className="text-xs text-neutral-500">{t('search:compare.selectedOfMax', { count: propertyCount, max: MAX_COMPARE })}</p>
                    </div>
                </div>
                <div className="w-full sm:w-auto flex items-center justify-end gap-3 flex-shrink-0">
                    <button
                        onClick={onClear}
                        className="text-sm font-semibold text-neutral-500 hover:text-primary transition-colors whitespace-nowrap"
                    >
                        {t('search:compare.clear')}
                    </button>
                    <button
                        onClick={onCompareNow}
                        disabled={!canCompare}
                        className="flex-grow sm:flex-grow-0 px-5 py-2.5 bg-primary/90 backdrop-blur-sm text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary hover:shadow-xl hover:shadow-primary/30 transition-all disabled:bg-neutral-300 disabled:shadow-none disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {t('search:compare.compareNow', { count: propertyCount })}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComparisonBar;

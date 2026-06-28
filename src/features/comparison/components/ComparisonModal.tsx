import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/shared/Modal';
import { Property } from '@/types';
import { formatPrice } from '@/utils/currency';
import { BuildingOfficeIcon, XMarkIcon } from '@/constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';

interface ComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    properties: Property[];
    onRemove?: (id: string) => void;
    onViewProperty?: (property: Property) => void;
}

interface RowDef {
    label: string;
    key: keyof Property;
    bestValue?: number | null;
    format: (p: Property) => string | number | string[] | null | undefined;
}

const BestBadge: React.FC = () => {
    const { t } = useTranslation(['property']);
    return (
        <span className="ml-1.5 inline-block px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full uppercase tracking-wide align-middle">
            {t('property:comparison.best', 'Best')}
        </span>
    );
};

const CompareModalImage: React.FC<{ property: Property }> = ({ property }) => {
    const [error, setError] = useState(!property.imageUrl);
    useEffect(() => { setError(!property.imageUrl); }, [property.imageUrl]);

    return (
        <>
            {error || !property.imageUrl ? (
                <div className="w-full h-28 bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center rounded-xl">
                    <BuildingOfficeIcon className="w-10 h-10 text-neutral-400" />
                </div>
            ) : (
                <img
                    src={optimizeCloudinaryUrl(property.imageUrl, { width: 384, quality: 'auto', crop: 'fill' })}
                    alt={property.title || property.address}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-28 object-cover rounded-xl"
                    onError={() => setError(true)}
                />
            )}
            {property.title && (
                <p className="font-bold text-sm mt-2 truncate text-neutral-900">{property.title}</p>
            )}
            <p className={`text-xs mt-0.5 truncate ${property.title ? 'text-neutral-500' : 'font-semibold text-neutral-700'}`}>
                {property.city}, {property.country}
            </p>
        </>
    );
};

const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose, properties, onRemove, onViewProperty }) => {
    const { t } = useTranslation(['property']);

    if (properties.length === 0) return null;

    const findBestValue = (key: keyof Property, direction: 'min' | 'max'): number | null => {
        const values = properties.map(p => p[key]).filter((v): v is number => typeof v === 'number');
        if (values.length === 0) return null;
        return direction === 'min' ? Math.min(...values) : Math.max(...values);
    };

    const bestPrice = findBestValue('price', 'min');
    const bestBeds = findBestValue('beds', 'max');
    const bestBaths = findBestValue('baths', 'max');
    const bestLivingRooms = findBestValue('livingRooms', 'max');
    const bestSqft = findBestValue('sqft', 'max');
    const bestYear = findBestValue('yearBuilt', 'max');
    const bestParking = findBestValue('parking', 'max');

    const rows: RowDef[] = [
        { label: t('property:comparison.price'), key: 'price', bestValue: bestPrice, format: (p) => (p.isNegotiable || !p.price || p.price <= 0) ? t('property:byNegotiation', 'By Negotiation') : formatPrice(p.price, p.country) },
        { label: t('property:comparison.beds'), key: 'beds', bestValue: bestBeds, format: (p) => p.beds },
        { label: t('property:comparison.baths'), key: 'baths', bestValue: bestBaths, format: (p) => p.baths },
        { label: t('property:comparison.livingRooms'), key: 'livingRooms', bestValue: bestLivingRooms, format: (p) => p.livingRooms },
        { label: t('property:comparison.area'), key: 'sqft', bestValue: bestSqft, format: (p) => p.sqft },
        { label: t('property:comparison.yearBuilt'), key: 'yearBuilt', bestValue: bestYear, format: (p) => p.yearBuilt },
        { label: t('property:comparison.parking'), key: 'parking', bestValue: bestParking, format: (p) => p.parking },
        { label: t('property:comparison.specialFeatures'), key: 'specialFeatures', format: (p) => p.specialFeatures },
        { label: t('property:comparison.materials'), key: 'materials', format: (p) => p.materials },
    ];

    const renderActions = (p: Property) => (
        <div className="flex gap-2 mt-3">
            {onViewProperty && (
                <button
                    onClick={() => { onViewProperty(p); onClose(); }}
                    className="flex-1 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                >
                    {t('property:comparison.viewProperty', 'View')}
                </button>
            )}
            {onRemove && (
                <button
                    onClick={() => onRemove(p.id)}
                    className="p-1.5 text-neutral-400 border border-neutral-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                    aria-label={t('property:comparison.removeFromComparison', 'Remove')}
                >
                    <XMarkIcon className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="5xl" title={t('property:comparison.title')}>
            {/* Mobile + Tablet card layout */}
            <div className="block md:hidden p-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {properties.map(p => (
                        <div key={p.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
                            <div className="p-3">
                                <CompareModalImage property={p} />
                                {renderActions(p)}
                            </div>
                            <div className="border-t border-neutral-100">
                                {rows.map(row => {
                                    const value = p[row.key];
                                    const displayValue = row.format(p);
                                    const isBest = row.bestValue != null && typeof value === 'number' && value === row.bestValue;
                                    const isArray = Array.isArray(displayValue);

                                    return (
                                        <div
                                            key={row.label}
                                            className={`flex justify-between items-start px-3 py-2.5 border-b border-neutral-50 last:border-b-0 ${isBest ? 'bg-emerald-50' : ''}`}
                                        >
                                            <span className="text-xs font-medium text-neutral-500 flex-shrink-0 mr-2">{row.label}</span>
                                            <span className={`text-xs text-right ${isBest ? 'text-emerald-700 font-bold' : 'text-neutral-900'}`}>
                                                {isArray
                                                    ? ((displayValue as string[]).length > 0 ? (displayValue as string[]).join(', ') : '-')
                                                    : (displayValue ?? '-')
                                                }
                                                {isBest && <BestBadge />}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop table layout */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b-2 border-neutral-200">
                            <th className="p-4 text-left font-bold text-neutral-700 min-w-[140px] sticky left-0 bg-white z-10 text-sm">
                                {t('property:comparison.feature')}
                            </th>
                            {properties.map(p => (
                                <th key={p.id} className="p-4 min-w-[200px] align-top">
                                    <CompareModalImage property={p} />
                                    {renderActions(p)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.label} className="border-b border-neutral-100 group transition-colors hover:bg-neutral-50">
                                <td className="p-4 font-semibold text-neutral-600 sticky left-0 bg-white group-hover:bg-neutral-50 z-10 text-sm">
                                    {row.label}
                                </td>
                                {properties.map(p => {
                                    const value = p[row.key];
                                    const displayValue = row.format(p);
                                    const isBest = row.bestValue != null && typeof value === 'number' && value === row.bestValue;
                                    const isArray = Array.isArray(displayValue);

                                    if (isArray) {
                                        return (
                                            <td key={p.id} className="p-4 text-sm align-top text-neutral-700">
                                                {(displayValue as string[]).length > 0 ? (
                                                    <ul className="space-y-1">
                                                        {(displayValue as string[]).map((item, i) => (
                                                            <li key={i} className="flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 flex-shrink-0" />
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <span className="text-neutral-400">-</span>
                                                )}
                                            </td>
                                        );
                                    }

                                    return (
                                        <td
                                            key={p.id}
                                            className={`p-4 text-center align-middle text-sm ${isBest ? 'bg-emerald-50' : ''}`}
                                        >
                                            <span className={isBest ? 'text-emerald-700 font-bold' : 'text-neutral-800'}>
                                                {displayValue ?? '-'}
                                            </span>
                                            {isBest && <BestBadge />}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Modal>
    );
};

export default ComparisonModal;

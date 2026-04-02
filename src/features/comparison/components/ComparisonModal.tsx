import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/shared/Modal';
import { Property } from '@/types';
import { formatPrice } from '@/utils/currency';
import { BuildingOfficeIcon } from '@/constants';

interface ComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    properties: Property[];
}

const HighlightedCell: React.FC<{ children: React.ReactNode; isBest: boolean }> = ({ children, isBest }) => (
    <td className={`p-4 text-center align-top ${isBest ? 'bg-green-50 text-green-800 font-bold' : ''}`}>
        {children}
    </td>
);

const CompareModalImage: React.FC<{ property: Property }> = ({ property }) => {
    const [error, setError] = useState(!property.imageUrl);
    useEffect(() => { setError(!property.imageUrl); }, [property.imageUrl]);
    return (
        <>
            {error || !property.imageUrl ? (
                <div className="w-full h-24 bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center rounded-lg">
                    <BuildingOfficeIcon className="w-10 h-10 text-neutral-400" />
                </div>
            ) : (
                <img src={optimizeCloudinaryUrl(property.imageUrl, { width: 384, quality: 'auto', crop: 'fill' })} alt={property.title || property.address} loading="lazy" decoding="async" className="w-full h-24 object-cover rounded-lg" onError={() => setError(true)} />
            )}
            {property.title && (
                <p className="font-bold text-sm mt-2 truncate text-neutral-900">{property.title}</p>
            )}
            <p className={`text-sm ${property.title ? 'text-neutral-500' : 'font-semibold mt-2'} truncate`}>{property.address}, {property.city}</p>
        </>
    )
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose, properties }) => {
    const { t } = useTranslation(['property']);

    if (properties.length === 0) return null;

    const findBestValue = (key: keyof Property, direction: 'min' | 'max') => {
        const values = properties.map(p => p[key]).filter(v => typeof v === 'number') as number[];
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

    const rows = [
        { label: t('property:comparison.price'), key: 'price', bestValue: bestPrice, format: (p: Property) => formatPrice(p.price, p.country) },
        { label: t('property:comparison.beds'), key: 'beds', bestValue: bestBeds, format: (p: Property) => p.beds },
        { label: t('property:comparison.baths'), key: 'baths', bestValue: bestBaths, format: (p: Property) => p.baths },
        { label: t('property:comparison.livingRooms'), key: 'livingRooms', bestValue: bestLivingRooms, format: (p: Property) => p.livingRooms },
        { label: t('property:comparison.area'), key: 'sqft', bestValue: bestSqft, format: (p: Property) => p.sqft },
        { label: t('property:comparison.yearBuilt'), key: 'yearBuilt', bestValue: bestYear, format: (p: Property) => p.yearBuilt },
        { label: t('property:comparison.parking'), key: 'parking', bestValue: bestParking, format: (p: Property) => p.parking },
        { label: t('property:comparison.specialFeatures'), key: 'specialFeatures', format: (p: Property) => p.specialFeatures },
        { label: t('property:comparison.materials'), key: 'materials', format: (p: Property) => p.materials },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="5xl" title={t('property:comparison.title')}>
            {/* Mobile Card Layout */}
            <div className="block md:hidden space-y-4 p-2">
                {properties.map(p => (
                    <div key={p.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                        <div className="p-3">
                            <CompareModalImage property={p} />
                        </div>
                        <div className="border-t border-neutral-100">
                            {rows.map(row => {
                                const value = p[row.key as keyof Property];
                                const displayValue = row.format(p);
                                const isBest = row.bestValue !== undefined && value === row.bestValue;

                                return (
                                    <div key={row.label} className={`flex justify-between items-start p-3 border-b border-neutral-50 last:border-b-0 ${isBest ? 'bg-green-50' : ''}`}>
                                        <span className="text-sm font-medium text-neutral-600 flex-shrink-0">{row.label}</span>
                                        <span className={`text-sm text-right ml-2 ${isBest ? 'text-green-700 font-bold' : 'text-neutral-900'}`}>
                                            {Array.isArray(displayValue)
                                                ? (displayValue.length > 0 ? displayValue.join(', ') : '-')
                                                : (displayValue || '-')
                                            }
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b-2 border-neutral-200">
                            <th className="p-4 text-left font-bold text-neutral-800 min-w-[120px] sticky left-0 bg-white z-10">{t('property:comparison.feature')}</th>
                            {properties.map(p => (
                                <th key={p.id} className="p-4 min-w-[180px]">
                                    <CompareModalImage property={p} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.label} className="border-b border-neutral-100 hover:bg-neutral-50">
                                <td className="p-4 font-semibold text-neutral-700 sticky left-0 bg-white hover:bg-neutral-50 z-10">{row.label}</td>
                                {properties.map(p => {
                                    const value = p[row.key as keyof Property];
                                    const displayValue = row.format(p);
                                    const isBest = row.bestValue !== undefined && value === row.bestValue;

                                    if(Array.isArray(displayValue)) {
                                      return (
                                        <td key={p.id} className="p-4 text-center text-sm align-top">
                                          <ul className="list-disc list-inside text-left space-y-1">
                                            {displayValue.length > 0 ? displayValue.map((item, index) => <li key={index}>{item}</li>) : '-'}
                                          </ul>
                                        </td>
                                      );
                                    }

                                    return (
                                        <HighlightedCell key={p.id} isBest={isBest}>
                                            <span className="text-sm">{displayValue}</span>
                                        </HighlightedCell>
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